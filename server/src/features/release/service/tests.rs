use anyhow::{Context, Result};
use entity::enums::CorrectionType;
use entity::{
    credit_role, release, release_credit, release_disc, release_track,
    release_track_artist,
};
use infra_testing::MockUser;
use sea_orm::ActiveValue::Set;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde_json::json;

use super::{NewCorrection, NewRelease, Service, correction_service};
use crate::features::user::User;
use crate::features::user_event::UserEventSender;
use crate::infra::integration_test::fixture::{MockArtist, MockSong};
use crate::infra::integration_test::test_connection;

fn change(
    author: &User,
    r#type: CorrectionType,
    data: serde_json::Value,
) -> Result<NewCorrection<NewRelease>> {
    Ok(NewCorrection {
        data: serde_json::from_value(data)?,
        author: author.clone(),
        description: String::new(),
        r#type,
    })
}

#[tokio::test]
async fn release_approval_replaces_the_track_list_and_preserves_credit_scopes()
-> Result<()> {
    let conn = test_connection().await?;
    let author = MockUser::with_label("release_revision_author")
        .insert(&conn)
        .await?
        .into();
    let approver = MockUser::with_label("release_revision_approver")
        .insert(&conn)
        .await?
        .into();
    let artist = MockArtist::named("Release revision artist")
        .insert(&conn)
        .await?;
    let old_song = MockSong::titled("Old release track").insert(&conn).await?;
    let first = MockSong::titled("First revised track")
        .insert(&conn)
        .await?;
    let second = MockSong::titled("Second revised track")
        .insert(&conn)
        .await?;
    let role_id = credit_role::Entity::insert(credit_role::ActiveModel {
        name: Set("Release revision credit".to_owned()),
        short_description: Set(String::new()),
        description: Set(String::new()),
        ..Default::default()
    })
    .exec(&conn)
    .await?
    .last_insert_id;
    let service = Service::new(
        infra_db::SeaOrmRepository::new(conn.clone()),
        UserEventSender::new(1),
    );
    let release_id = service
        .create(change(&author, CorrectionType::Create, json!({
            "title": "Before approval",
            "release_type": "Album",
            "artists": [],
            "catalog_nums": [],
            "credits": [{"artist_id": artist.id, "role_id": role_id, "on": null}],
            "discs": [{"name": "Original disc"}],
            "events": [],
            "localized_titles": [],
            "links": [],
            "tracks": [{"song_id": old_song.id, "disc_index": 0, "artists": [artist.id]}],
        }))?)
        .await?
        .entity_id;
    let correction_id = service
        .upsert_correction(
            release_id,
            change(&author, CorrectionType::Update, json!({
                "title": "After approval",
                "release_type": "Album",
                "artists": [],
                "catalog_nums": [],
                "credits": [{"artist_id": artist.id, "role_id": role_id, "on": [1]}],
                "discs": [{"name": "Disc A"}, {"name": "Disc B"}],
                "events": [],
                "localized_titles": [],
                "links": [],
                "tracks": [
                    {"song_id": first.id, "disc_index": 1, "artists": []},
                    {"song_id": second.id, "disc_index": 0, "artists": [artist.id]},
                ],
            }))?,
            correction_service::CorrectionUpsertMode::Create,
        )
        .await?
        .submitted_id()
        .context("the release update should be pending")?;
    correction_service::approve(
        &service.repo,
        service.user_events.clone(),
        correction_id,
        approver,
    )
    .await?;

    let release = release::Entity::find_by_id(release_id)
        .one(&conn)
        .await?
        .context("the approved release should exist")?;
    assert_eq!(release.title, "After approval");
    let mut tracks = release_track::Entity::find()
        .find_also_related(release_disc::Entity)
        .filter(release_track::Column::ReleaseId.eq(release_id))
        .all(&conn)
        .await?;
    tracks.sort_unstable_by_key(|(track, _)| track.id);
    let assignments = tracks
        .iter()
        .map(|(track, disc)| {
            (
                track.song_id,
                disc.as_ref().and_then(|disc| disc.name.as_deref()),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        assignments,
        [(first.id, Some("Disc B")), (second.id, Some("Disc A"))]
    );
    let track_artists = release_track_artist::Entity::find()
        .filter(
            release_track_artist::Column::TrackId
                .is_in(tracks.iter().map(|(track, _)| track.id)),
        )
        .all(&conn)
        .await?;
    assert_eq!(track_artists.len(), 1);
    assert_eq!(track_artists[0].track_id, tracks[1].0.id);
    assert_eq!(track_artists[0].artist_id, artist.id);
    let credits = release_credit::Entity::find()
        .filter(release_credit::Column::ReleaseId.eq(release_id))
        .all(&conn)
        .await?;
    assert_eq!(credits.len(), 1);
    assert_eq!(credits[0].on.as_deref(), Some([1].as_slice()));
    Ok(())
}
