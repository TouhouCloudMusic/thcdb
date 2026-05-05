use std::collections::BTreeSet;

use entity::enums::{CorrectionUserType, EntityType};
use entity::{
    artist, artist_alias_history, artist_history, artist_link_history,
    artist_localized_name_history, artist_membership_history,
    artist_membership_role_history, artist_membership_tenure_history,
    correction as correction_entity, correction_user, credit_role,
    credit_role_history, credit_role_inheritance_history, event,
    event_alternative_name_history, event_history, label,
    label_founder_history, label_history, label_localized_name_history,
    release, release_artist_history, release_catalog_number_history,
    release_credit_history, release_disc_history, release_event_history,
    release_history, release_localized_title_history,
    release_track_artist_history, release_track_history, song,
    song_artist_history, song_credit_history, song_history,
    song_language_history, song_localized_title_history, song_lyrics,
    song_lyrics_history, song_relation_history, tag,
    tag_alternative_name_history, tag_history, tag_relation_history, user,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, JoinType, LoaderTrait,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
use serde_json::{Value, json};

use crate::domain::correction::CorrectionDiffEntry;
use crate::features::correction::model::CorrectionUserSummary;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::BrokenEntityReference;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum SnapshotError {
    #[display("{_0}")]
    BrokenReference(#[error(source)] BrokenEntityReference),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}

pub async fn find_correction(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<Option<correction_entity::Model>, DbErr> {
    correction_entity::Entity::find_by_id(correction_id)
        .one(conn)
        .await
}

pub async fn correction_exists(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<bool, DbErr> {
    Ok(find_correction(conn, correction_id).await?.is_some())
}

pub async fn find_author(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<CorrectionUserSummary, DbErr> {
    let Some((id, name)) = correction_user::Entity::find()
        .select_only()
        .column(user::Column::Id)
        .column(user::Column::Name)
        .join(JoinType::InnerJoin, correction_user::Relation::User.def())
        .filter(correction_user::Column::CorrectionId.eq(correction_id))
        .filter(
            correction_user::Column::UserType.eq(CorrectionUserType::Author),
        )
        .into_tuple::<(i32, String)>()
        .one(conn)
        .await?
    else {
        return Err(DbErr::Custom(format!(
            "Correction {correction_id} author not found"
        )));
    };

    Ok(CorrectionUserSummary { id, name })
}

pub async fn find_entity_name(
    conn: &impl ConnectionTrait,
    entity_type: EntityType,
    entity_id: i32,
) -> Result<String, DbErr> {
    let name = match entity_type {
        EntityType::Artist => artist::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::Label => label::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::Release => release::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.title),
        EntityType::Song => song::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.title),
        EntityType::Tag => tag::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::Event => event::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::SongLyrics => {
            match song_lyrics::Entity::find_by_id(entity_id).one(conn).await? {
                Some(lyrics) => song::Entity::find_by_id(lyrics.song_id)
                    .one(conn)
                    .await?
                    .map(|model| model.title),
                None => None,
            }
        }
        EntityType::CreditRole => credit_role::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
    };

    // TODO: Convert this to a custom error type.
    name.ok_or_else(|| {
        DbErr::Custom(format!("{entity_type:?} #{entity_id} not found"))
    })
}

pub async fn snapshot_for_history(
    db: &impl ConnectionTrait,
    entity_type: EntityType,
    history_id: i32,
) -> Result<Value, SnapshotError> {
    match entity_type {
        EntityType::Artist => snapshot_artist(db, history_id).await,
        EntityType::Label => snapshot_label(db, history_id).await,
        EntityType::Release => snapshot_release(db, history_id).await,
        EntityType::Song => snapshot_song(db, history_id).await,
        EntityType::Tag => snapshot_tag(db, history_id).await,
        EntityType::Event => snapshot_event(db, history_id).await,
        EntityType::SongLyrics => snapshot_song_lyrics(db, history_id).await,
        EntityType::CreditRole => snapshot_credit_role(db, history_id).await,
    }
    .db_operation("load correction history snapshot")
    .map_err(SnapshotError::from)
}

pub fn diff_snapshots(
    before: &Value,
    after: &Value,
) -> Vec<CorrectionDiffEntry> {
    let mut entries = Vec::new();
    diff_walk("", Some(before), Some(after), &mut entries);
    entries
}

fn diff_walk(
    path: &str,
    before: Option<&Value>,
    after: Option<&Value>,
    out: &mut Vec<CorrectionDiffEntry>,
) {
    match (before, after) {
        (Some(Value::Object(before_map)), Some(Value::Object(after_map))) => {
            let mut keys = BTreeSet::new();
            keys.extend(before_map.keys().map(String::as_str));
            keys.extend(after_map.keys().map(String::as_str));
            for key in keys {
                let next = if path.is_empty() {
                    key.to_string()
                } else {
                    format!("{path}.{key}")
                };
                diff_walk(&next, before_map.get(key), after_map.get(key), out);
            }
        }
        (Some(Value::Array(before_arr)), Some(Value::Array(after_arr))) => {
            if before_arr != after_arr {
                out.push(CorrectionDiffEntry {
                    path: format_path(path),
                    before: Some(value_to_string(&Value::Array(
                        before_arr.clone(),
                    ))),
                    after: Some(value_to_string(&Value::Array(
                        after_arr.clone(),
                    ))),
                });
            }
        }
        (Some(before_val), Some(after_val)) => {
            if before_val != after_val {
                out.push(CorrectionDiffEntry {
                    path: format_path(path),
                    before: Some(value_to_string(before_val)),
                    after: Some(value_to_string(after_val)),
                });
            }
        }
        (Some(before_val), None) => {
            out.push(CorrectionDiffEntry {
                path: format_path(path),
                before: Some(value_to_string(before_val)),
                after: None,
            });
        }
        (None, Some(after_val)) => {
            out.push(CorrectionDiffEntry {
                path: format_path(path),
                before: None,
                after: Some(value_to_string(after_val)),
            });
        }
        (None, None) => {}
    }
}

fn format_path(path: &str) -> String {
    if path.is_empty() {
        "$".to_string()
    } else {
        path.to_string()
    }
}

fn value_to_string(value: &Value) -> String {
    match value {
        Value::String(val) => val.clone(),
        _ => serde_json::to_string_pretty(value)
            .unwrap_or_else(|_| value.to_string()),
    }
}

fn date_with_precision(
    value: Option<chrono::NaiveDate>,
    precision: Option<entity::sea_orm_active_enums::DatePrecision>,
) -> Value {
    match (value, precision) {
        (Some(value), Some(precision)) => json!({
            "value": value,
            "precision": date_precision_string(precision),
        }),
        _ => Value::Null,
    }
}

const fn date_precision_string(
    precision: entity::sea_orm_active_enums::DatePrecision,
) -> &'static str {
    match precision {
        entity::sea_orm_active_enums::DatePrecision::Day => "Day",
        entity::sea_orm_active_enums::DatePrecision::Month => "Month",
        entity::sea_orm_active_enums::DatePrecision::Year => "Year",
    }
}

fn location_value(
    country: Option<&str>,
    province: Option<&str>,
    city: Option<&str>,
) -> Value {
    if country.is_none() && province.is_none() && city.is_none() {
        Value::Null
    } else {
        json!({
            "country": country,
            "province": province,
            "city": city,
        })
    }
}

async fn snapshot_artist(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = artist_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::Custom("Artist history not found".to_string()))?;

    let aliases = artist_alias_history::Entity::find()
        .filter(artist_alias_history::Column::HistoryId.eq(history_id))
        .order_by_asc(artist_alias_history::Column::AliasId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.alias_id)
        .collect::<Vec<_>>();

    let links = artist_link_history::Entity::find()
        .filter(artist_link_history::Column::HistoryId.eq(history_id))
        .order_by_asc(artist_link_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.url)
        .collect::<Vec<_>>();

    let localized_names = artist_localized_name_history::Entity::find()
        .filter(artist_localized_name_history::Column::HistoryId.eq(history_id))
        .order_by_asc(artist_localized_name_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "language_id": model.language_id,
                "name": model.name,
            })
        })
        .collect::<Vec<_>>();

    let memberships = artist_membership_history::Entity::find()
        .filter(artist_membership_history::Column::HistoryId.eq(history_id))
        .order_by_asc(artist_membership_history::Column::Id)
        .all(db)
        .await?;

    let roles = memberships
        .load_many(artist_membership_role_history::Entity, db)
        .await?;
    let tenures = memberships
        .load_many(artist_membership_tenure_history::Entity, db)
        .await?;

    let membership_values = memberships
        .iter()
        .zip(roles)
        .zip(tenures)
        .map(|((membership, role_history), tenure_history)| {
            let roles = role_history
                .into_iter()
                .map(|role| role.role_id)
                .collect::<Vec<_>>();
            let tenures = tenure_history
                .into_iter()
                .map(|tenure| {
                    json!({
                        "join_year": tenure.join_year,
                        "leave_year": tenure.leave_year,
                    })
                })
                .collect::<Vec<_>>();
            json!({
                "id": membership.id,
                "artist_id": membership.artist_id,
                "roles": roles,
                "tenures": tenures,
            })
        })
        .collect::<Vec<_>>();

    Ok(json!({
        "name": history.name,
        "artist_type": history.artist_type,
        "text_alias": history.text_alias,
        "start_date": date_with_precision(
            history.start_date,
            history.start_date_precision,
        ),
        "end_date": date_with_precision(
            history.end_date,
            history.end_date_precision,
        ),
        "start_location": location_value(
            history.start_location_country.as_deref(),
            history.start_location_province.as_deref(),
            history.start_location_city.as_deref(),
        ),
        "current_location": location_value(
            history.current_location_country.as_deref(),
            history.current_location_province.as_deref(),
            history.current_location_city.as_deref(),
        ),
        "links": links,
        "aliases": aliases,
        "localized_names": localized_names,
        "memberships": membership_values,
    }))
}

async fn snapshot_label(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = label_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::Custom("Label history not found".to_string()))?;

    let founders = label_founder_history::Entity::find()
        .filter(label_founder_history::Column::HistoryId.eq(history_id))
        .order_by_asc(label_founder_history::Column::ArtistId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.artist_id)
        .collect::<Vec<_>>();

    let localized_names = label_localized_name_history::Entity::find()
        .filter(label_localized_name_history::Column::HistoryId.eq(history_id))
        .order_by_asc(label_localized_name_history::Column::LanguageId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "language_id": model.language_id,
                "name": model.name,
            })
        })
        .collect::<Vec<_>>();

    Ok(json!({
        "name": history.name,
        "founded_date": date_with_precision(
            history.founded_date,
            Some(history.founded_date_precision),
        ),
        "dissolved_date": date_with_precision(
            history.dissolved_date,
            Some(history.dissolved_date_precision),
        ),
        "founders": founders,
        "localized_names": localized_names,
    }))
}

#[expect(clippy::too_many_lines, reason = "snapshot release composition")]
async fn snapshot_release(
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
                "on": model.on,
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
        .map(|model| model.catalog_number)
        .collect::<Vec<_>>();

    let discs = release_disc_history::Entity::find()
        .filter(release_disc_history::Column::HistoryId.eq(history_id))
        .order_by_asc(release_disc_history::Column::Id)
        .all(db)
        .await?;

    let tracks = discs.load_many(release_track_history::Entity, db).await?;

    let track_lengths = tracks.iter().map(Vec::len).collect::<Vec<_>>();

    let flat_tracks = tracks.into_iter().flatten().collect::<Vec<_>>();
    let flat_track_artists = flat_tracks
        .load_many(release_track_artist_history::Entity, db)
        .await?;

    let mut track_iter = flat_tracks.into_iter();
    let mut artist_iter = flat_track_artists.into_iter();

    let tracks = track_lengths
        .iter()
        .map(|len| track_iter.by_ref().take(*len).collect())
        .collect::<Vec<Vec<_>>>();
    let track_artists = track_lengths
        .iter()
        .map(|len| artist_iter.by_ref().take(*len).collect())
        .collect::<Vec<Vec<_>>>();

    let track_values = discs
        .iter()
        .zip(tracks)
        .zip(track_artists)
        .map(|((disc, tracks), artists)| {
            let track_values = tracks
                .iter()
                .zip(artists)
                .map(|(track, artist)| {
                    let artist_ids = artist
                        .iter()
                        .map(|artist| artist.artist_id)
                        .collect::<Vec<_>>();
                    json!({
                        "song_id": track.song_id,
                        "track_number": track.track_number,
                        "display_title": track.display_title,
                        "duration": track.duration,
                        "artists": artist_ids,
                    })
                })
                .collect::<Vec<_>>();
            json!({
                "name": disc.name,
                "tracks": track_values,
            })
        })
        .collect::<Vec<_>>();

    let release_events = release_event_history::Entity::find()
        .filter(release_event_history::Column::HistoryId.eq(history_id))
        .order_by_asc(release_event_history::Column::EventId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.event_id)
        .collect::<Vec<_>>();

    Ok(json!({
        "title": history.title,
        "release_type": history.release_type,
        "release_date": date_with_precision(
            history.release_date,
            Some(history.release_date_precision),
        ),
        "recording_date_start": date_with_precision(
            history.recording_date_start,
            Some(history.recording_date_start_precision),
        ),
        "recording_date_end": date_with_precision(
            history.recording_date_end,
            Some(history.recording_date_end_precision),
        ),
        "discs": track_values,
        "release_events": release_events,
        "credits": credits,
        "artists": artists,
        "localized_titles": localized_titles,
        "catalog_numbers": catalog_numbers,
    }))
}

async fn snapshot_song(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = song_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::Custom("Song history not found".to_string()))?;

    let artists = song_artist_history::Entity::find()
        .filter(song_artist_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_artist_history::Column::ArtistId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.artist_id)
        .collect::<Vec<_>>();

    let credits = song_credit_history::Entity::find()
        .filter(song_credit_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_credit_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "artist_id": model.artist_id,
                "role_id": model.role_id,
            })
        })
        .collect::<Vec<_>>();

    let localized_titles = song_localized_title_history::Entity::find()
        .filter(song_localized_title_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_localized_title_history::Column::Id)
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

    let language_ids = song_language_history::Entity::find()
        .filter(song_language_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_language_history::Column::LanguageId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.language_id)
        .collect::<Vec<_>>();

    let relations = song_relation_history::Entity::find()
        .filter(song_relation_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_relation_history::Column::RelatedSongId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "related_song_id": model.related_song_id,
                "relation_type_id": model.relation_type_id,
                "description": model.description,
            })
        })
        .collect::<Vec<_>>();

    Ok(json!({
        "title": history.title,
        "artists": artists,
        "credits": credits,
        "localized_titles": localized_titles,
        "languages": language_ids,
        "relations": relations,
    }))
}

async fn snapshot_tag(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = tag_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::Custom("Tag history not found".to_string()))?;

    let alternative_names = tag_alternative_name_history::Entity::find()
        .filter(tag_alternative_name_history::Column::HistoryId.eq(history_id))
        .order_by_asc(tag_alternative_name_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.name)
        .collect::<Vec<_>>();

    let relations = tag_relation_history::Entity::find()
        .filter(tag_relation_history::Column::HistoryId.eq(history_id))
        .order_by_asc(tag_relation_history::Column::RelatedTagId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "related_tag_id": model.related_tag_id,
                "type": model.r#type,
            })
        })
        .collect::<Vec<_>>();

    Ok(json!({
        "name": history.name,
        "type": history.r#type,
        "short_description": history.short_description,
        "description": history.description,
        "alternative_names": alternative_names,
        "relations": relations,
    }))
}

async fn snapshot_event(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = event_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::Custom("Event history not found".to_string()))?;

    let alternative_names = event_alternative_name_history::Entity::find()
        .filter(
            event_alternative_name_history::Column::HistoryId.eq(history_id),
        )
        .order_by_asc(event_alternative_name_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.name)
        .collect::<Vec<_>>();

    Ok(json!({
        "name": history.name,
        "description": history.description,
        "short_description": history.short_description,
        "start_date": date_with_precision(
            history.start_date,
            Some(history.start_date_precision),
        ),
        "end_date": date_with_precision(
            history.end_date,
            Some(history.end_date_precision),
        ),
        "location": location_value(
            history.location_country.as_deref(),
            history.location_province.as_deref(),
            history.location_city.as_deref(),
        ),
        "alternative_names": alternative_names,
    }))
}

async fn snapshot_song_lyrics(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = song_lyrics_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Song lyrics history not found".to_string())
        })?;

    Ok(json!({
        "language_id": history.language_id,
        "content": history.content,
        "is_main": history.is_main,
    }))
}

async fn snapshot_credit_role(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = credit_role_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Credit role history not found".to_string())
        })?;

    let inherits = credit_role_inheritance_history::Entity::find()
        .filter(
            credit_role_inheritance_history::Column::HistoryId.eq(history_id),
        )
        .order_by_asc(credit_role_inheritance_history::Column::SuperId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.super_id)
        .collect::<Vec<_>>();

    Ok(json!({
        "name": history.name,
        "description": history.description,
        "inherits": inherits,
    }))
}
