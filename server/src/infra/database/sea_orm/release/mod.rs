use entity::{release, release_history};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    QueryFilter, QueryOrder,
};

use crate::domain::release::model::{NewRelease, Release};
use crate::domain::release::repo::{Filter, Repo, TxRepo};
use crate::domain::repository::Connection;
use crate::infra::error::Error;

mod impls;
use impls::*;
mod mapper;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_one(&self, filter: Filter) -> Result<Option<Release>, Error> {
        let condition = match filter {
            Filter::Id(id) => release::Column::Id.eq(id),
            Filter::Keyword(keyword) => {
                release::Column::Title.like(format!("%{keyword}%"))
            }
        };

        Ok(find_many_impl(condition, self.conn())
            .await?
            .into_iter()
            .next())
    }

    async fn find_many(&self, filter: Filter) -> Result<Vec<Release>, Error> {
        let condition = match filter {
            Filter::Id(id) => release::Column::Id.eq(id),
            Filter::Keyword(keyword) => {
                release::Column::Title.like(format!("%{keyword}%"))
            }
        };

        let res = find_many_impl(condition, self.conn()).await?;

        Ok(res)
    }
}

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(&self, data: &NewRelease) -> Result<i32, Error> {
        // Create the release model
        let release =
            release::ActiveModel::from(data).insert(self.conn()).await?;

        // Create related entities
        tokio::try_join!(
            create_release_artist(release.id, &data.artists, self.conn()),
            create_release_catalog_number(
                release.id,
                &data.catalog_nums,
                self.conn()
            ),
            create_release_credit(release.id, &data.credits, self.conn()),
            create_release_event(release.id, &data.events, self.conn()),
            create_release_localized_title(
                release.id,
                &data.localized_titles,
                self.conn()
            ),
            create_release_track(
                release.id,
                &data.tracks,
                0, // Since we don't have author_id here, using 0 temporarily
                self.conn()
            )
        )?;

        Ok(release.id)
    }

    async fn create_history(&self, data: &NewRelease) -> Result<i32, Error> {
        // Create the release history model
        let history = release_history::ActiveModel::from(data)
            .insert(self.conn())
            .await?;

        // Create history records for related entities
        tokio::try_join!(
            create_release_artist_history(
                history.id,
                &data.artists,
                self.conn()
            ),
            create_release_catalog_number_history(
                history.id,
                &data.catalog_nums,
                self.conn()
            ),
            create_release_credit_history(
                history.id,
                &data.credits,
                self.conn()
            ),
            create_release_event_history(history.id, &data.events, self.conn()),
            create_release_localized_title_history(
                history.id,
                &data.localized_titles,
                self.conn()
            ),
            create_release_track_history(
                history.id,
                &data.tracks,
                0, // Since we don't have author_id here, using 0 temporarily
                0, // Using 0 for now since we don't have the actual release_id
                self.conn()
            )
        )?;

        Ok(history.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Error> {
        // Retrieve the correction history ID
        let revision = entity::correction_revision::Entity::find()
            .filter(
                entity::correction_revision::Column::CorrectionId
                    .eq(correction.id),
            )
            .order_by_desc(entity::correction_revision::Column::EntityHistoryId)
            .one(self.conn())
            .await?
            .ok_or_else(|| {
                Error::from(DbErr::Custom(
                    "Correction revision not found".to_string(),
                ))
            })?;

        // Fetch the release history
        let history =
            release_history::Entity::find_by_id(revision.entity_history_id)
                .one(self.conn())
                .await?
                .ok_or_else(|| {
                    Error::from(DbErr::Custom(
                        "Release history not found".to_string(),
                    ))
                })?;

        // Update the release and all related entities
        tokio::try_join!(
            async {
                // Update the release with data from the history
                let update_model = release::ActiveModel {
                    id: Set(correction.entity_id),
                    title: Set(history.title),
                    release_type: Set(history.release_type),
                    release_date: Set(history.release_date),
                    release_date_precision: Set(history.release_date_precision),
                    recording_date_start: Set(history.recording_date_start),
                    recording_date_start_precision: Set(
                        history.recording_date_start_precision
                    ),
                    recording_date_end: Set(history.recording_date_end),
                    recording_date_end_precision: Set(
                        history.recording_date_end_precision
                    ),
                };

                update_model.update(self.conn()).await
            },
            update_release_artist(
                correction.entity_id,
                history.id,
                self.conn()
            ),
            update_release_catalog_number(
                correction.entity_id,
                history.id,
                self.conn()
            ),
            update_release_credit(
                correction.entity_id,
                history.id,
                self.conn()
            ),
            update_release_event(correction.entity_id, history.id, self.conn()),
            update_release_localized_title(
                correction.entity_id,
                history.id,
                self.conn()
            ),
            update_release_track(
                correction.entity_id,
                history.id,
                0, // Since we don't have author_id here, using 0 temporarily
                self.conn()
            )
        )?;

        Ok(())
    }
}
