use anyhow::{Result, anyhow, ensure};
use domain::shared::EntityIdent;
use entity::enums::{
    CorrectionStatus, CorrectionType, EntityType, SongRelationType,
};
use entity::{
    correction, correction_revision, song_relation, song_relation_history,
};
use infra_db::SeaOrmRepository;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use super::{apply_update, create_history};
use crate::features::song::model::{
    NewSong, NewSongRelation, SongRelationDirection,
};
use crate::infra::integration_test::fixture::{MockSong, MockUser};
use crate::infra::integration_test::test_connection;

fn song_correction(
    title: &str,
    related_song_id: i32,
    direction: SongRelationDirection,
    relation_type: SongRelationType,
    description: &str,
) -> Result<NewSong> {
    Ok(NewSong {
        title: EntityIdent::try_new(title).map_err(|_| {
            anyhow!("test song title is a valid entity identifier")
        })?,
        artists: None,
        credits: None,
        languages: None,
        localized_titles: None,
        links: None,
        relations: Some(vec![NewSongRelation {
            related_song_id,
            direction,
            relation_type,
            description: description.to_owned(),
        }]),
    })
}

async fn apply_relation_correction(
    repo: &SeaOrmRepository,
    author_id: i32,
    edited_song_id: i32,
    data: &NewSong,
) -> Result<i32> {
    let tx_repo = repo.begin_tx().await?;
    let history_id = create_history(&tx_repo, edited_song_id, data).await?;
    let correction = correction::Entity::insert(correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Approved),
        r#type: Set(CorrectionType::Update),
        entity_type: Set(EntityType::Song),
        entity_id: Set(edited_song_id),
        created_at: NotSet,
        handled_at: NotSet,
    })
    .exec_with_returning(tx_repo.conn())
    .await?;
    correction_revision::Entity::insert(correction_revision::ActiveModel {
        correction_id: Set(correction.id),
        entity_history_id: Set(history_id),
        author_id: Set(author_id),
        description: Set("relation direction test".to_owned()),
    })
    .exec(tx_repo.conn())
    .await?;

    apply_update(correction, tx_repo.conn()).await?;
    tx_repo.commit().await?;

    Ok(history_id)
}

async fn assert_relation_state(
    repo: &SeaOrmRepository,
    source_id: i32,
    derived_id: i32,
    relation_type: SongRelationType,
    description: &str,
) -> Result<()> {
    let relations = song_relation::Entity::find()
        .filter(
            song_relation::Column::SourceId
                .is_in([source_id, derived_id])
                .or(song_relation::Column::DerivedId
                    .is_in([source_id, derived_id])),
        )
        .all(&repo.conn)
        .await?;
    let relations = relations
        .iter()
        .map(|relation| {
            (
                relation.source_id,
                relation.derived_id,
                relation.relation_type,
                relation.description.as_str(),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        relations,
        [(source_id, derived_id, relation_type, description)]
    );

    Ok(())
}

async fn assert_relation_history(
    repo: &SeaOrmRepository,
    history_id: i32,
    source_id: i32,
    derived_id: i32,
    relation_type: SongRelationType,
    description: &str,
) -> Result<()> {
    let relations = song_relation_history::Entity::find()
        .filter(song_relation_history::Column::HistoryId.eq(history_id))
        .all(&repo.conn)
        .await?;
    let relations = relations
        .iter()
        .map(|relation| {
            (
                relation.source_id,
                relation.derived_id,
                relation.relation_type,
                relation.description.as_str(),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        relations,
        [(source_id, derived_id, relation_type, description)]
    );

    Ok(())
}

#[tokio::test]
async fn song_corrections_preserve_relation_direction_from_either_side()
-> Result<()> {
    let conn = test_connection().await?;
    let derived = MockSong::titled("correction direction derived")
        .insert(&conn)
        .await?;
    let source = MockSong::titled("correction direction source")
        .insert(&conn)
        .await?;
    ensure!(source.id > derived.id);
    let author = MockUser::with_label("correction_direction_author")
        .insert(&conn)
        .await?;
    let repo = SeaOrmRepository::new(conn);

    let source_submission = song_correction(
        &source.title,
        derived.id,
        SongRelationDirection::Source,
        SongRelationType::Arrangement,
        "source submission",
    )?;
    let first_history_id = apply_relation_correction(
        &repo,
        author.id,
        source.id,
        &source_submission,
    )
    .await?;
    assert_relation_history(
        &repo,
        first_history_id,
        source.id,
        derived.id,
        SongRelationType::Arrangement,
        "source submission",
    )
    .await?;
    assert_relation_state(
        &repo,
        source.id,
        derived.id,
        SongRelationType::Arrangement,
        "source submission",
    )
    .await?;

    let derived_submission = song_correction(
        &derived.title,
        source.id,
        SongRelationDirection::Derived,
        SongRelationType::Remix,
        "derived submission",
    )?;
    let second_history_id = apply_relation_correction(
        &repo,
        author.id,
        derived.id,
        &derived_submission,
    )
    .await?;
    assert_relation_history(
        &repo,
        second_history_id,
        source.id,
        derived.id,
        SongRelationType::Remix,
        "derived submission",
    )
    .await?;
    assert_relation_state(
        &repo,
        source.id,
        derived.id,
        SongRelationType::Remix,
        "derived submission",
    )
    .await?;
    assert_relation_history(
        &repo,
        first_history_id,
        source.id,
        derived.id,
        SongRelationType::Arrangement,
        "source submission",
    )
    .await?;

    Ok(())
}
