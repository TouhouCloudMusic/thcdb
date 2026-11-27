use std::collections::BTreeSet;

use entity::enums::{CorrectionUserType, EntityType};
use entity::{
    artist, correction_user, credit_role, event, label, release, song,
    song_lyrics, tag, user,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, JoinType, QueryFilter,
    QuerySelect, RelationTrait,
};
use serde_json::Value;
use user_core::UserSummary;

use crate::features::correction::CorrectionDiffEntry;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub async fn find_author(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<UserSummary, DbErr> {
    infra_db::trace("correction.find_author", async {
        let Some((id, name)) = correction_user::Entity::find()
            .select_only()
            .column(user::Column::Id)
            .column(user::Column::Name)
            .join(JoinType::InnerJoin, correction_user::Relation::User.def())
            .filter(correction_user::Column::CorrectionId.eq(correction_id))
            .filter(
                correction_user::Column::UserType
                    .eq(CorrectionUserType::Author),
            )
            .into_tuple::<(i32, String)>()
            .one(conn)
            .await?
        else {
            return Err(DbErr::Custom(format!(
                "Correction {correction_id} author not found"
            )));
        };

        Ok(UserSummary { id, name })
    })
    .await
}

pub async fn find_entity_name(
    conn: &impl ConnectionTrait,
    entity_type: EntityType,
    entity_id: i32,
) -> Result<Option<String>, DbErr> {
    infra_db::trace("correction.find_entity_name", async {
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
                match song_lyrics::Entity::find_by_id(entity_id)
                    .one(conn)
                    .await?
                {
                    Some(lyrics) => song::Entity::find_by_id(lyrics.song_id)
                        .one(conn)
                        .await?
                        .map(|model| model.title),
                    None => None,
                }
            }
            EntityType::CreditRole => {
                credit_role::Entity::find_by_id(entity_id)
                    .one(conn)
                    .await?
                    .map(|model| model.name)
            }
        };

        Ok(name)
    })
    .await
}

#[infra_db::observe("correction.snapshot_for_history")]
pub async fn snapshot_for_history(
    db: &impl ConnectionTrait,
    entity_type: EntityType,
    history_id: i32,
) -> Result<Value, DatabaseError> {
    let snapshot = match entity_type {
        EntityType::Artist => {
            artist_repo::load_history_snapshot(db, history_id).await
        }
        EntityType::Label => {
            label_repo::load_history_snapshot(db, history_id).await
        }
        EntityType::Release => {
            release_repo::load_history_snapshot(db, history_id).await
        }
        EntityType::Song => {
            song_repo::load_history_snapshot(db, history_id).await
        }
        EntityType::Tag => {
            tag_repo::load_history_snapshot(db, history_id).await
        }
        EntityType::Event => {
            event_repo::load_history_snapshot(db, history_id).await
        }
        EntityType::SongLyrics => {
            song_lyrics_repo::load_history_snapshot(db, history_id).await
        }
        EntityType::CreditRole => {
            credit_role_repo::load_history_snapshot(db, history_id).await
        }
    }
    .db_context("load correction history snapshot")?;
    Ok(snapshot)
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

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use entity::enums::EntityType;
    use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
    use entity::{
        credit_role, label, release_catalog_number_history,
        release_credit_history, release_disc_history, release_history,
        release_track_history,
    };
    use googletest::assert_that;
    use googletest::matchers::{elements_are, pat};
    use json_matcher::matches_json;
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::{ConnectionTrait, EntityTrait};
    use serde_json::{Value, json};

    use super::{CorrectionDiffEntry, diff_snapshots, snapshot_for_history};
    use crate::infra::integration_test::fixture::{MockArtist, MockSong};
    use crate::infra::integration_test::test_connection;

    async fn insert_release_history(
        conn: &impl ConnectionTrait,
    ) -> anyhow::Result<i32> {
        let history =
            release_history::Entity::insert(release_history::ActiveModel {
                id: NotSet,
                title: Set("Snapshot test release".to_owned()),
                release_type: Set(ReleaseType::Album),
                release_date: Set(None),
                release_date_precision: Set(DatePrecision::Day),
                recording_date_start: Set(None),
                recording_date_start_precision: Set(DatePrecision::Day),
                recording_date_end: Set(None),
                recording_date_end_precision: Set(DatePrecision::Day),
            })
            .exec_with_returning(conn)
            .await?;

        Ok(history.id)
    }

    #[tokio::test]
    async fn track_references_are_preserved_in_snapshots() -> anyhow::Result<()>
    {
        let conn = test_connection().await?;
        let tx = conn.begin().await?;
        let artist = MockArtist::named("Snapshot credit artist")
            .insert(&tx)
            .await?;
        let role = credit_role::Entity::insert(credit_role::ActiveModel {
            id: NotSet,
            name: Set("Snapshot credit role".to_owned()),
            short_description: Set("Role summary".to_owned()),
            description: Set("Role description".to_owned()),
        })
        .exec_with_returning(&tx)
        .await?;
        let song_a = MockSong::titled("Track A").insert(&tx).await?;
        let song_b = MockSong::titled("Track B").insert(&tx).await?;
        let tracks = [(song_a.id, 0), (song_b.id, 1)];
        let mut reordered_tracks = tracks;
        reordered_tracks.reverse();
        let before_history_id = insert_release_history(&tx).await?;
        let after_history_id = insert_release_history(&tx).await?;

        for (history_id, tracks) in [
            (before_history_id, &tracks),
            (after_history_id, &reordered_tracks),
        ] {
            let discs = release_disc_history::Entity::insert_many(
                [None, None].map(|name| release_disc_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(history_id),
                    name: Set(name),
                }),
            )
            .exec_with_returning_many(&tx)
            .await?;
            release_track_history::Entity::insert_many(tracks.iter().map(
                |&(song_id, disc_index)| release_track_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(history_id),
                    song_id: Set(song_id),
                    track_number: Set(None),
                    display_title: Set(None),
                    duration: Set(None),
                    disc_history_id: Set(discs[disc_index].id),
                },
            ))
            .exec(&tx)
            .await?;
            release_credit_history::Entity::insert(
                release_credit_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(history_id),
                    artist_id: Set(artist.id),
                    role_id: Set(role.id),
                    on: Set(Some(vec![0])),
                },
            )
            .exec(&tx)
            .await?;
        }

        let before =
            snapshot_for_history(&tx, EntityType::Release, before_history_id)
                .await?;
        let after =
            snapshot_for_history(&tx, EntityType::Release, after_history_id)
                .await?;
        let diff = diff_snapshots(&before, &after);

        assert_that!(
            &before,
            matches_json!({
                "credits": [{"on": [0]}],
                "tracks": [
                    {"song_id": song_a.id, "disc_index": 0},
                    {"song_id": song_b.id, "disc_index": 1},
                ],
            }),
        );

        let mut expected_after = before.clone();
        expected_after["tracks"] =
            json!([before["tracks"][1], before["tracks"][0]]);
        assert_eq!(after, expected_after);

        assert_that!(
            &diff,
            elements_are![pat!(CorrectionDiffEntry {
                path: "tracks",
                before: &Some(serde_json::to_string_pretty(&before["tracks"])?),
                after: &Some(serde_json::to_string_pretty(&after["tracks"])?),
            })],
        );

        tx.rollback().await?;
        Ok(())
    }

    #[tokio::test]
    async fn changing_only_a_catalog_number_label_appears_in_the_release_diff()
    -> anyhow::Result<()> {
        let conn = test_connection().await?;
        let label = label::Entity::insert(label::ActiveModel {
            id: NotSet,
            name: Set("Snapshot test label".to_owned()),
            founded_date: Set(None),
            founded_date_precision: Set(DatePrecision::Day),
            dissolved_date: Set(None),
            dissolved_date_precision: Set(DatePrecision::Day),
        })
        .exec_with_returning(&conn)
        .await?;
        let before_history_id = insert_release_history(&conn).await?;
        let after_history_id = insert_release_history(&conn).await?;

        release_catalog_number_history::Entity::insert(
            release_catalog_number_history::ActiveModel {
                id: NotSet,
                history_id: Set(before_history_id),
                catalog_number: Set("CAT-001".to_owned()),
                label_id: Set(None),
            },
        )
        .exec(&conn)
        .await?;
        release_catalog_number_history::Entity::insert(
            release_catalog_number_history::ActiveModel {
                id: NotSet,
                history_id: Set(after_history_id),
                catalog_number: Set("CAT-001".to_owned()),
                label_id: Set(Some(label.id)),
            },
        )
        .exec(&conn)
        .await?;

        let before =
            snapshot_for_history(&conn, EntityType::Release, before_history_id)
                .await?;
        let after =
            snapshot_for_history(&conn, EntityType::Release, after_history_id)
                .await?;
        let diff = diff_snapshots(&before, &after);

        assert_eq!(diff.len(), 1);
        assert_eq!(diff[0].path, "catalog_numbers");
        assert_eq!(
            serde_json::from_str::<Value>(
                diff[0].before.as_deref().expect("before value"),
            )?,
            json!([{
                "catalog_number": "CAT-001",
                "label_id": null,
            }]),
        );
        assert_eq!(
            serde_json::from_str::<Value>(
                diff[0].after.as_deref().expect("after value"),
            )?,
            json!([{
                "catalog_number": "CAT-001",
                "label_id": label.id,
            }]),
        );

        Ok(())
    }
}
