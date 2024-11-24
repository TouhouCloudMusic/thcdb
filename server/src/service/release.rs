use crate::error::{LogErr, ServiceError};
use bon::bon;
use chrono::NaiveDate;
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{release, release_artist};
use sea_orm::{
    ActiveValue, DatabaseConnection, DbErr, EntityTrait, IntoActiveValue,
    TransactionError, TransactionTrait,
};

#[derive(Default, Clone)]
pub struct Service {
    database: DatabaseConnection,
}

#[bon]
impl Service {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> anyhow::Result<Option<release::Model>, DbErr> {
        release::Entity::find_by_id(id).one(&self.database).await
    }

    #[builder]
    pub async fn create(
        &self,
        title: String,
        release_type: ReleaseType,
        release_date: Option<NaiveDate>,
        release_date_precision: Option<DatePrecision>,
        recording_date_start: Option<NaiveDate>,
        recording_date_start_precision: Option<DatePrecision>,
        recording_date_end: Option<NaiveDate>,
        recording_date_end_precision: Option<DatePrecision>,
        artists: Vec<i32>,
    ) -> Result<release::Model, ServiceError> {
        let active_model = release::ActiveModel {
            id: ActiveValue::NotSet,
            title: ActiveValue::Set(title),
            release_type: ActiveValue::Set(release_type),
            release_date: ActiveValue::Set(release_date),
            release_date_precision: release_date_precision.into_active_value(),
            recording_date_start: ActiveValue::Set(recording_date_start),
            recording_date_start_precision: recording_date_start_precision
                .into_active_value(),
            recording_date_end: ActiveValue::Set(recording_date_end),
            recording_date_end_precision: recording_date_end_precision
                .into_active_value(),
            created_at: ActiveValue::NotSet,
            updated_at: ActiveValue::NotSet,
        };

        let new_release = self
            .database
            .transaction::<_, _, DbErr>(|tx| {
                Box::pin(async move {
                    let result = release::Entity::insert(active_model)
                        .exec_with_returning(tx)
                        .await?;

                    let release_artist = artists.into_iter().map(|artist_id| {
                        release_artist::ActiveModel {
                            release_id: ActiveValue::Set(result.id),
                            artist_id: ActiveValue::Set(artist_id),
                        }
                    });

                    release_artist::Entity::insert_many(release_artist)
                        .exec(tx)
                        .await?;

                    Ok(result)
                })
            })
            .await
            .log_err()
            .map_err(|e| match e {
                TransactionError::Connection(e) => e,
                TransactionError::Transaction(e) => e,
            })?;

        // TODO: Other relations

        Ok(new_release)
    }
}
