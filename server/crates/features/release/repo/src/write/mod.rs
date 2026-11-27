use entity::{release, release_history};
use infra_db::DatabaseTransaction;
use infra_db::error::DatabaseError;
use sea_orm::{ActiveModelTrait, DbErr};

mod artist;
mod catalog_number;
mod credit;
mod disc;
mod event;
mod link;
mod localized_title;
mod mapper;
mod model;
mod track;

use artist::{create_release_artist, create_release_artist_history};
use catalog_number::{
    create_release_catalog_number, create_release_catalog_number_history,
};
use credit::{create_release_credit, create_release_credit_history};
use disc::{create_release_disc, create_release_disc_history};
use event::{create_release_event, create_release_event_history};
use link::{create_release_link, create_release_link_history};
use localized_title::{
    create_release_localized_title, create_release_localized_title_history,
};
pub use model::{
    CreditScope, NewCatalogNumber, NewCredit, NewDisc, NewRelease, NewTrack,
};
use track::{create_release_track, create_release_track_history};

async fn create_release_with_relations(
    data: &NewRelease,
    tx: &DatabaseTransaction,
) -> Result<i32, DbErr> {
    infra_db::trace("release.insert_with_relations", async {
        let release = release::ActiveModel::from(data).insert(tx).await?;

        tokio::try_join!(
            create_release_artist(release.id, &data.artists, tx),
            create_release_catalog_number(release.id, &data.catalog_nums, tx),
            create_release_credit(release.id, &data.credits, tx),
            create_release_event(release.id, &data.events, tx),
            create_release_link(release.id, &data.links, tx),
            create_release_localized_title(
                release.id,
                &data.localized_titles,
                tx
            )
        )?;

        let discs = create_release_disc(release.id, &data.discs, tx).await?;
        create_release_track(release.id, &data.tracks, &discs, tx).await?;

        Ok(release.id)
    })
    .await
}

async fn create_release_history_with_relations(
    data: &NewRelease,
    tx: &DatabaseTransaction,
) -> Result<i32, DbErr> {
    infra_db::trace("release.insert_history_with_relations", async {
        let history =
            release_history::ActiveModel::from(data).insert(tx).await?;

        tokio::try_join!(
            create_release_artist_history(history.id, &data.artists, tx),
            create_release_catalog_number_history(
                history.id,
                &data.catalog_nums,
                tx
            ),
            create_release_credit_history(history.id, &data.credits, tx),
            create_release_event_history(history.id, &data.events, tx),
            create_release_link_history(history.id, &data.links, tx),
            create_release_localized_title_history(
                history.id,
                &data.localized_titles,
                tx
            )
        )?;

        let disc_histories =
            create_release_disc_history(history.id, &data.discs, tx).await?;
        create_release_track_history(
            history.id,
            &data.tracks,
            &disc_histories,
            tx,
        )
        .await?;

        Ok(history.id)
    })
    .await
}

/// Inserts the current release in the caller's transaction.
///
/// Validate `data` before calling this function.
#[infra_db::observe("release.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    Ok(create_release_with_relations(data, tx).await?)
}

/// Inserts a release snapshot in the caller's transaction.
///
/// Validate `data` before calling this function.
#[infra_db::observe("release.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    Ok(create_release_history_with_relations(data, tx).await?)
}
