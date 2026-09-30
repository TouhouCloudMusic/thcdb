use std::collections::HashSet;

use anyhow::{Context, Result, anyhow};
use domain::shared::EntityIdent;
use entity::enums::{
    CorrectionStatus, CorrectionType, EntityType, SongRelationType,
};
use entity::{
    correction, correction_revision, language, release, release_disc,
    release_track, song_artist, song_credit, song_language, song_link,
    song_localized_title, song_relation,
};
use infra_db::SeaOrmRepository;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DatabaseConnection, EntityTrait, IntoActiveModel, QueryOrder};

use super::{find_by_id, find_pending_correction, load_relation_summaries};
use crate::features::song::model::{
    NewSong, NewSongRelation, SongRelationDirection,
};
use crate::features::song::repo::create_history;
use crate::infra::integration_test::fixture::{
    MockArtist, MockRelease, MockSong, MockUser,
};
use crate::infra::integration_test::test_connection;

fn song_snapshot(
    title: &str,
    relations: Vec<NewSongRelation>,
) -> Result<NewSong> {
    Ok(NewSong {
        title: EntityIdent::try_new(title)
            .map_err(|_| anyhow!("test song title is valid"))?,
        artists: Some(vec![]),
        credits: Some(vec![]),
        languages: Some(vec![]),
        localized_titles: Some(vec![]),
        links: Some(vec![]),
        relations: Some(relations),
    })
}

async fn insert_pending_revision(
    repo: &SeaOrmRepository,
    song_id: i32,
    author_id: i32,
    correction_id: Option<i32>,
    data: &NewSong,
) -> Result<i32> {
    let tx_repo = repo.begin_tx().await?;
    let history_id = create_history(&tx_repo, song_id, data).await?;
    let correction_id = match correction_id {
        Some(correction_id) => correction_id,
        None => {
            correction::Entity::insert(correction::ActiveModel {
                id: NotSet,
                status: Set(CorrectionStatus::Pending),
                r#type: Set(CorrectionType::Update),
                entity_type: Set(EntityType::Song),
                entity_id: Set(song_id),
                created_at: NotSet,
                handled_at: NotSet,
            })
            .exec_with_returning(tx_repo.conn())
            .await?
            .id
        }
    };
    correction_revision::Entity::insert(correction_revision::ActiveModel {
        correction_id: Set(correction_id),
        entity_history_id: Set(history_id),
        author_id: Set(author_id),
        description: Set("pending song snapshot test".to_owned()),
    })
    .exec(tx_repo.conn())
    .await?;
    tx_repo.commit().await?;

    Ok(correction_id)
}

async fn insert_correction(
    repo: &SeaOrmRepository,
    entity_id: i32,
    entity_type: EntityType,
    status: CorrectionStatus,
) -> Result<i32> {
    Ok(correction::Entity::insert(correction::ActiveModel {
        id: NotSet,
        status: Set(status),
        r#type: Set(CorrectionType::Update),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
        created_at: NotSet,
        handled_at: NotSet,
    })
    .exec_with_returning(&repo.conn)
    .await?
    .id)
}

async fn insert_release_with_discs(
    conn: &DatabaseConnection,
    title: &str,
    release_date: Option<&str>,
    discs: &[&[(i32, &str)]],
) -> Result<i32> {
    let release = release::Entity::insert(release::ActiveModel {
        release_date: Set(release_date.map(str::parse).transpose()?),
        ..MockRelease::titled(title).into_active_model()
    })
    .exec_with_returning(conn)
    .await?;
    for tracks in discs {
        let disc = release_disc::Entity::insert(release_disc::ActiveModel {
            id: NotSet,
            release_id: Set(release.id),
            name: Set(None),
        })
        .exec_with_returning(conn)
        .await?;
        release_track::Entity::insert_many(tracks.iter().map(
            |&(song_id, track_number)| release_track::ActiveModel {
                id: NotSet,
                release_id: Set(release.id),
                song_id: Set(song_id),
                track_number: Set(Some(track_number.to_owned())),
                display_title: Set(None),
                duration: Set(None),
                disc_id: Set(disc.id),
            },
        ))
        .exec(conn)
        .await?;
    }
    Ok(release.id)
}

#[tokio::test]
async fn reading_either_song_returns_its_relation_direction_and_the_other_songs_summary()
-> Result<()> {
    let conn = test_connection().await?;
    let source = MockSong::titled("relation source").insert(&conn).await?;
    let derived = MockSong::titled("relation derived").insert(&conn).await?;
    let (first_artist, second_artist) = tokio::try_join!(
        MockArtist::named("related artist one").insert(&conn),
        MockArtist::named("related artist two").insert(&conn),
    )?;
    let artist_ids = [first_artist.id, second_artist.id];
    song_artist::Entity::insert_many(artist_ids.iter().map(|artist_id| {
        song_artist::ActiveModel {
            song_id: Set(derived.id),
            artist_id: Set(*artist_id),
        }
    }))
    .exec(&conn)
    .await?;
    song_relation::Entity::insert(song_relation::ActiveModel {
        id: NotSet,
        description: Set("arrangement".to_owned()),
        relation_type: Set(SongRelationType::Arrangement),
        source_id: Set(source.id),
        derived_id: Set(derived.id),
    })
    .exec(&conn)
    .await?;
    let unrelated_song = MockSong::titled("unrelated release track")
        .insert(&conn)
        .await?;
    let first_release_id = insert_release_with_discs(
        &conn,
        "first relation release",
        None,
        &[
            &[(unrelated_song.id, "A1")],
            &[(derived.id, "B1"), (derived.id, "B2")],
        ],
    )
    .await?;
    let repo = SeaOrmRepository::new(conn);

    let loaded_source = find_by_id(&repo, source.id)
        .await?
        .context("source song exists")?;
    assert_eq!(loaded_source.relations.len(), 1);
    let source_relation = &loaded_source.relations[0];
    assert_eq!(source_relation.song.id, derived.id);
    assert_eq!(source_relation.direction, SongRelationDirection::Source);
    assert_eq!(source_relation.r#type, SongRelationType::Arrangement);
    assert_eq!(source_relation.description, "arrangement");
    assert_eq!(
        source_relation
            .song
            .artists
            .iter()
            .map(|artist| artist.id)
            .collect::<HashSet<_>>(),
        HashSet::from(artist_ids),
    );

    let related_release = source_relation
        .song
        .release
        .as_ref()
        .context("related song has a release")?;
    assert_eq!(related_release.id, first_release_id);
    let track_positions = related_release
        .track_positions
        .iter()
        .map(|position| {
            (position.disc_number, position.track_number.as_deref())
        })
        .collect::<Vec<_>>();
    assert_eq!(track_positions, [(2, Some("B1")), (2, Some("B2"))]);

    let loaded_derived = find_by_id(&repo, derived.id)
        .await?
        .context("derived song exists")?;
    assert_eq!(loaded_derived.relations.len(), 1);
    let derived_relation = &loaded_derived.relations[0];
    assert_eq!(derived_relation.song.id, source.id);
    assert_eq!(derived_relation.direction, SongRelationDirection::Derived);
    assert!(derived_relation.song.release.is_none());

    Ok(())
}

#[tokio::test]
async fn related_songs_use_the_earliest_known_release_with_stable_date_ties()
-> Result<()> {
    let conn = test_connection().await?;
    let related = MockSong::titled("related song with multiple releases")
        .insert(&conn)
        .await?;
    for (title, date) in [
        ("unknown date release", None),
        ("later dated release", Some("2020-01-01")),
    ] {
        insert_release_with_discs(&conn, title, date, &[&[(related.id, "01")]])
            .await?;
    }
    let first_release_id = insert_release_with_discs(
        &conn,
        "earliest dated release",
        Some("2002-08-11"),
        &[&[(related.id, "02")]],
    )
    .await?;
    insert_release_with_discs(
        &conn,
        "same date later release ID",
        Some("2002-08-11"),
        &[&[(related.id, "03")]],
    )
    .await?;
    let mut summaries = load_relation_summaries(&[related.id], &conn).await?;
    let summary = summaries
        .remove(&related.id)
        .context("related song has a summary")?;
    assert_eq!(
        summary.release.context("related song has a release")?.id,
        first_release_id
    );
    Ok(())
}

#[tokio::test]
async fn reading_a_pending_correction_returns_the_latest_song_revision()
-> Result<()> {
    let conn = test_connection().await?;
    let song = MockSong::titled("formal song title").insert(&conn).await?;
    let related = MockSong::titled("formal related song")
        .insert(&conn)
        .await?;
    song_relation::Entity::insert(song_relation::ActiveModel {
        id: NotSet,
        description: Set("formal relation".to_owned()),
        relation_type: Set(SongRelationType::Arrangement),
        source_id: Set(song.id),
        derived_id: Set(related.id),
    })
    .exec(&conn)
    .await?;
    let author = MockUser::with_label("pending snapshot author")
        .insert(&conn)
        .await?;
    let repo = SeaOrmRepository::new(conn);
    let correction_id = insert_pending_revision(
        &repo,
        song.id,
        author.id,
        None,
        &song_snapshot(
            "previous pending title",
            vec![NewSongRelation {
                related_song_id: related.id,
                direction: SongRelationDirection::Source,
                relation_type: SongRelationType::Cover,
                description: "previous pending relation".to_owned(),
            }],
        )?,
    )
    .await?;
    insert_pending_revision(
        &repo,
        song.id,
        author.id,
        Some(correction_id),
        &song_snapshot(
            "latest pending title",
            vec![NewSongRelation {
                related_song_id: related.id,
                direction: SongRelationDirection::Derived,
                relation_type: SongRelationType::Remix,
                description: "pending relation".to_owned(),
            }],
        )?,
    )
    .await?;

    let loaded = find_pending_correction(&repo, song.id, correction_id)
        .await?
        .context("matching pending song exists")?;
    assert_eq!(loaded.title, "latest pending title");
    assert_eq!(loaded.relations.len(), 1);
    assert_eq!(loaded.relations[0].song.id, related.id);
    assert_eq!(
        loaded.relations[0].direction,
        SongRelationDirection::Derived
    );
    assert_eq!(loaded.relations[0].r#type, SongRelationType::Remix);
    assert_eq!(loaded.relations[0].description, "pending relation");

    let formal = find_by_id(&repo, song.id)
        .await?
        .context("formal song still exists")?;
    assert_eq!(formal.title, "formal song title");
    assert_eq!(formal.relations[0].description, "formal relation");

    Ok(())
}

#[tokio::test]
async fn reading_a_pending_correction_keeps_cleared_song_collections_empty()
-> Result<()> {
    let conn = test_connection().await?;
    let song = MockSong::titled("formal song title").insert(&conn).await?;
    let related = MockSong::titled("formal related song")
        .insert(&conn)
        .await?;
    let artist = MockArtist::named("formal artist").insert(&conn).await?;
    let language = language::Entity::find()
        .order_by_asc(language::Column::Id)
        .one(&conn)
        .await?
        .context("startup language exists")?;
    song_artist::Entity::insert(song_artist::ActiveModel {
        song_id: Set(song.id),
        artist_id: Set(artist.id),
    })
    .exec(&conn)
    .await?;
    song_credit::Entity::insert(song_credit::ActiveModel {
        id: NotSet,
        song_id: Set(song.id),
        artist_id: Set(artist.id),
        role_id: Set(None),
    })
    .exec(&conn)
    .await?;
    song_language::Entity::insert(song_language::ActiveModel {
        song_id: Set(song.id),
        language_id: Set(language.id),
    })
    .exec(&conn)
    .await?;
    song_localized_title::Entity::insert(song_localized_title::ActiveModel {
        id: NotSet,
        song_id: Set(song.id),
        language_id: Set(language.id),
        title: Set("formal localized title".to_owned()),
    })
    .exec(&conn)
    .await?;
    song_link::Entity::insert(song_link::ActiveModel {
        id: NotSet,
        song_id: Set(song.id),
        url: Set("https://example.com/formal".to_owned()),
    })
    .exec(&conn)
    .await?;
    song_relation::Entity::insert(song_relation::ActiveModel {
        id: NotSet,
        description: Set("formal relation".to_owned()),
        relation_type: Set(SongRelationType::Arrangement),
        source_id: Set(song.id),
        derived_id: Set(related.id),
    })
    .exec(&conn)
    .await?;
    let author = MockUser::with_label("empty snapshot author")
        .insert(&conn)
        .await?;
    let repo = SeaOrmRepository::new(conn);
    let correction_id = insert_pending_revision(
        &repo,
        song.id,
        author.id,
        None,
        &song_snapshot("latest empty title", vec![])?,
    )
    .await?;

    let loaded = find_pending_correction(&repo, song.id, correction_id)
        .await?
        .context("matching pending song exists")?;
    assert_eq!(loaded.title, "latest empty title");
    assert_eq!(loaded.artists.as_slice(), &[]);
    assert_eq!(loaded.credits.len(), 0);
    assert_eq!(loaded.languages.as_slice(), &[]);
    assert_eq!(loaded.localized_titles.len(), 0);
    assert_eq!(loaded.links, Vec::<String>::new());
    assert_eq!(loaded.relations.as_slice(), &[]);

    Ok(())
}

#[tokio::test]
async fn only_a_pending_correction_for_the_requested_song_returns_a_snapshot()
-> Result<()> {
    let conn = test_connection().await?;
    let song = MockSong::titled("correction target").insert(&conn).await?;
    let other_song = MockSong::titled("other correction target")
        .insert(&conn)
        .await?;
    let author = MockUser::with_label("correction validation author")
        .insert(&conn)
        .await?;
    let repo = SeaOrmRepository::new(conn);
    let valid_id = insert_pending_revision(
        &repo,
        song.id,
        author.id,
        None,
        &song_snapshot("valid pending snapshot", vec![])?,
    )
    .await?;
    let other_song_id = insert_pending_revision(
        &repo,
        other_song.id,
        author.id,
        None,
        &song_snapshot("other song snapshot", vec![])?,
    )
    .await?;
    let other_type_id = insert_correction(
        &repo,
        song.id,
        EntityType::Artist,
        CorrectionStatus::Pending,
    )
    .await?;
    let approved_id = insert_correction(
        &repo,
        song.id,
        EntityType::Song,
        CorrectionStatus::Approved,
    )
    .await?;
    let rejected_id = insert_correction(
        &repo,
        song.id,
        EntityType::Song,
        CorrectionStatus::Rejected,
    )
    .await?;

    for (correction_id, expected) in [
        (valid_id, true),
        (other_song_id, false),
        (other_type_id, false),
        (approved_id, false),
        (rejected_id, false),
        (-1, false),
    ] {
        assert_eq!(
            find_pending_correction(&repo, song.id, correction_id)
                .await?
                .is_some(),
            expected,
            "correction id {correction_id}",
        );
    }

    Ok(())
}
