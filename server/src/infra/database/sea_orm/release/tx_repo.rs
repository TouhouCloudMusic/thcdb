use entity::{release, release_history};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    QueryFilter, QueryOrder,
};

use super::impls::*;
use crate::domain::release::{NewRelease, TxRepo};

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let revision = entity::correction_revision::Entity::find()
        .filter(
            entity::correction_revision::Column::CorrectionId
                .eq(correction.id),
        )
        .order_by_desc(entity::correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Correction revision not found".to_string())
        })?;

    let history =
        release_history::Entity::find_by_id(revision.entity_history_id)
            .one(tx)
            .await?
            .ok_or_else(|| {
                DbErr::Custom("Release history not found".to_string())
            })?;

    let update_model = release::ActiveModel {
        id: Set(correction.entity_id),
        title: Set(history.title),
        release_type: Set(history.release_type),
        release_date: Set(history.release_date),
        release_date_precision: Set(history.release_date_precision),
        recording_date_start: Set(history.recording_date_start),
        recording_date_start_precision: Set(
            history.recording_date_start_precision,
        ),
        recording_date_end: Set(history.recording_date_end),
        recording_date_end_precision: Set(
            history.recording_date_end_precision,
        ),
    };
    update_model.update(tx).await?;
    tokio::try_join!(
        update_release_artist(correction.entity_id, history.id, tx),
        update_release_catalog_number(correction.entity_id, history.id, tx),
        update_release_credit(correction.entity_id, history.id, tx),
        update_release_event(correction.entity_id, history.id, tx),
        update_release_localized_title(correction.entity_id, history.id, tx),
        update_release_track_and_disc(correction.entity_id, history.id, tx),
    )?;

    Ok(())
}

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(
        &self,
        data: &NewRelease,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let release =
            release::ActiveModel::from(data).insert(self.conn()).await?;

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
            )
        )?;

        let discs =
            create_release_disc(release.id, &data.discs, self.conn()).await?;
        create_release_track(release.id, &data.tracks, &discs, self.conn())
            .await?;

        Ok(release.id)
    }

    async fn create_history(
        &self,
        data: &NewRelease,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let history = release_history::ActiveModel::from(data)
            .insert(self.conn())
            .await?;

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
            )
        )?;

        let disc_histories =
            create_release_disc_history(history.id, &data.discs, self.conn())
                .await?;
        create_release_track_history(
            history.id,
            &data.tracks,
            &disc_histories,
            self.conn(),
        )
        .await?;

        Ok(history.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        apply_update(correction, self.conn()).await?;
        Ok(())
    }
}
