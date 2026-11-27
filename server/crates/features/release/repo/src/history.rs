use std::collections::BTreeMap;

use domain::shared::DateWithPrecision;
use entity::{
    release_artist_history, release_catalog_number_history,
    release_credit_history, release_disc_history, release_event_history,
    release_history, release_link_history, release_localized_title_history,
    release_track_artist_history, release_track_history,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use serde_json::{Value, json};

#[fastrace::trace(name = "correction.snapshot_release")]
pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = release_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Release history not found".to_string())
        })?;

    let artists = release_artist_history::Entity::find()
        .filter(release_artist_history::Column::HistoryId.eq(history_id))
        .order_by_asc(release_artist_history::Column::ArtistId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.artist_id)
        .collect::<Vec<_>>();

    let credits = release_credit_history::Entity::find()
        .filter(release_credit_history::Column::HistoryId.eq(history_id))
        .order_by_asc(release_credit_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "artist_id": model.artist_id,
                "role_id": model.role_id,
                "on": model.on.filter(|indices| !indices.is_empty()),
            })
        })
        .collect::<Vec<_>>();

    let localized_titles = release_localized_title_history::Entity::find()
        .filter(
            release_localized_title_history::Column::HistoryId.eq(history_id),
        )
        .order_by_asc(release_localized_title_history::Column::LanguageId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "language_id": model.language_id,
                "title": model.title,
            })
        })
        .collect::<Vec<_>>();

    let catalog_numbers = release_catalog_number_history::Entity::find()
        .filter(
            release_catalog_number_history::Column::HistoryId.eq(history_id),
        )
        .order_by_asc(release_catalog_number_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "catalog_number": model.catalog_number,
                "label_id": model.label_id,
            })
        })
        .collect::<Vec<_>>();

    let discs = release_disc_history::Entity::find()
        .filter(release_disc_history::Column::HistoryId.eq(history_id))
        .order_by_asc(release_disc_history::Column::Id)
        .all(db)
        .await?;

    let tracks = release_track_history::Entity::find()
        .filter(release_track_history::Column::HistoryId.eq(history_id))
        .order_by_asc(release_track_history::Column::Id)
        .all(db)
        .await?;
    let track_artists = tracks
        .load_many(release_track_artist_history::Entity, db)
        .await?;
    let disc_indices = discs
        .iter()
        .enumerate()
        .map(|(index, disc)| (disc.id, index))
        .collect::<BTreeMap<_, _>>();

    let track_values = tracks
        .iter()
        .zip(track_artists)
        .map(|(track, artists)| {
            let artist_ids = artists
                .iter()
                .map(|artist| artist.artist_id)
                .collect::<Vec<_>>();
            json!({
                "song_id": track.song_id,
                "track_number": track.track_number,
                "display_title": track.display_title,
                "duration": track.duration,
                "disc_index": disc_indices[&track.disc_history_id],
                "artists": artist_ids,
            })
        })
        .collect::<Vec<_>>();
    let discs = discs
        .into_iter()
        .map(|disc| json!({ "name": disc.name }))
        .collect::<Vec<_>>();

    let release_events = release_event_history::Entity::find()
        .filter(release_event_history::Column::HistoryId.eq(history_id))
        .order_by_asc(release_event_history::Column::EventId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.event_id)
        .collect::<Vec<_>>();

    let links = release_link_history::Entity::find()
        .filter(release_link_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.url)
        .collect::<Vec<_>>();

    Ok(json!({
        "title": history.title,
        "release_type": history.release_type,
        "release_date": DateWithPrecision::from_option(
            history.release_date,
            history.release_date_precision,
        ),
        "recording_date_start": DateWithPrecision::from_option(
            history.recording_date_start,
            history.recording_date_start_precision,
        ),
        "recording_date_end": DateWithPrecision::from_option(
            history.recording_date_end,
            history.recording_date_end_precision,
        ),
        "discs": discs,
        "tracks": track_values,
        "release_events": release_events,
        "credits": credits,
        "artists": artists,
        "localized_titles": localized_titles,
        "links": links,
        "catalog_numbers": catalog_numbers,
    }))
}
