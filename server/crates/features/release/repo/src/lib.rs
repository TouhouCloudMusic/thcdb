mod associations;
mod detail;
mod disc;
mod history;
mod list;
mod query;
pub mod write;

pub use associations::{load_artists, load_cover_art_urls};
pub use detail::{
    CatalogNumber, FindReleaseFilter, Release, ReleaseArtist, ReleaseCredit,
    ReleaseDisc, ReleaseTrack, SongRef, find_many, find_one,
};
use entity::{
    release, release_artist, release_artist_history, release_catalog_number,
    release_catalog_number_history, release_credit, release_credit_history,
    release_event, release_event_history, release_history, release_link,
    release_link_history, release_localized_title,
    release_localized_title_history,
};
pub use history::load_history_snapshot;
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError};
pub use list::{ReleaseListItem, load_list, load_list_with_match};
pub use query::{find_list_by_ids, find_list_page};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    PaginatorTrait, QueryFilter, QuerySelect,
};

#[infra_db::observe("release.exists")]
pub async fn exists(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<bool, DatabaseError> {
    let count = release::Entity::find()
        .select_only()
        .expr(1)
        .filter(release::Column::Id.eq(id))
        .count(db)
        .await?;
    Ok(count > 0)
}

macro_rules! replace_from_history {
    ($name:ident, $span:literal, $live:ident, $history:ident, |$row:ident| {
        $($field:ident: $value:expr),+ $(,)?
    }) => {
        async fn $name(
            release_id: i32,
            history_id: i32,
            tx: &DatabaseTransaction,
        ) -> Result<(), DbErr> {
            infra_db::trace($span, async {
                $live::Entity::delete_many()
                    .filter($live::Column::ReleaseId.eq(release_id))
                    .exec(tx)
                    .await?;

                let rows = $history::Entity::find()
                    .filter($history::Column::HistoryId.eq(history_id))
                    .all(tx)
                    .await?;

                if !rows.is_empty() {
                    let models = rows.into_iter().map(|$row| $live::ActiveModel {
                        release_id: Set(release_id),
                        $($field: $value),+
                    });
                    $live::Entity::insert_many(models).exec(tx).await?;
                }
                Ok(())
            })
            .await
        }
    };
}

replace_from_history!(
    update_release_artist, "release.update_artist",
    release_artist, release_artist_history, |row| { artist_id: Set(row.artist_id) }
);
replace_from_history!(
    update_release_catalog_number, "release.update_catalog_number",
    release_catalog_number, release_catalog_number_history, |row| {
        id: NotSet,
        label_id: Set(row.label_id),
        catalog_number: Set(row.catalog_number),
    }
);
replace_from_history!(
    update_release_credit, "release.update_credit",
    release_credit, release_credit_history, |row| {
        id: NotSet,
        artist_id: Set(row.artist_id),
        role_id: Set(row.role_id),
        on: Set(row.on.filter(|indices| !indices.is_empty())),
    }
);
replace_from_history!(
    update_release_event, "release.update_event",
    release_event, release_event_history, |row| { event_id: Set(row.event_id) }
);
replace_from_history!(
    update_release_link, "release.update_link",
    release_link, release_link_history, |row| {
        id: NotSet,
        url: Set(row.url),
    }
);
replace_from_history!(
    update_release_localized_title, "release.update_localized_title",
    release_localized_title, release_localized_title_history, |row| {
        language_id: Set(row.language_id),
        title: Set(row.title),
    }
);

#[infra_db::observe("release.apply_update")]
pub async fn apply_history(
    tx: &DatabaseTransaction,
    release_id: i32,
    history_id: i32,
) -> Result<(), DatabaseError> {
    let history = release_history::Entity::find_by_id(history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "release history",
            id: history_id,
        })?;

    let update_model = release::ActiveModel {
        id: Set(release_id),
        title: Set(history.title),
        release_type: Set(history.release_type),
        release_date: Set(history.release_date),
        release_date_precision: Set(history.release_date_precision),
        recording_date_start: Set(history.recording_date_start),
        recording_date_start_precision: Set(
            history.recording_date_start_precision
        ),
        recording_date_end: Set(history.recording_date_end),
        recording_date_end_precision: Set(history.recording_date_end_precision),
    };
    update_model.update(tx).await?;
    tokio::try_join!(
        update_release_artist(release_id, history_id, tx),
        update_release_catalog_number(release_id, history_id, tx),
        update_release_credit(release_id, history_id, tx),
        update_release_event(release_id, history_id, tx),
        update_release_link(release_id, history_id, tx),
        update_release_localized_title(release_id, history_id, tx),
        disc::update_release_track_and_disc(release_id, history_id, tx),
    )?;

    Ok(())
}
