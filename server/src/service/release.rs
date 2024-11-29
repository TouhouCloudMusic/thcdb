use bon::bon;
use chrono::NaiveDate;
use entity::sea_orm_active_enums::{
    ChangeRequestStatus, ChangeRequestType, ChangeRequestUserType,
    DatePrecision, EntityType, ReleaseType,
};
use entity::{
    change_request, change_request_history, change_request_user, release,
    release_artist, release_artist_history, release_credit,
    release_credit_history, release_history, release_label,
    release_label_history, release_localized_title,
    release_localized_title_history, release_track, release_track_artist,
    release_track_artist_history, release_track_history, song,
};
use futures::future;
use itertools::{Either, Itertools};
use sea_orm::ActiveValue::NotSet;
use sea_orm::{
    ActiveModelTrait, ActiveValue, DatabaseConnection, DatabaseTransaction,
    DbErr, EntityTrait, IntoActiveModel, IntoActiveValue, Set,
    TransactionTrait,
};

use crate::error::ServiceError;
use crate::model::release::input::{
    Credit, LinkedTrack, LocalizedTitle, Track,
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
        localized_titles: Vec<LocalizedTitle>,
        labels: Vec<i32>,
        tracks: Vec<Track>,
        credits: Vec<Credit>,
        author_id: i32,
        description: String,
    ) -> Result<release::Model, ServiceError> {
        let transaction = self.database.begin().await?;
        let tx = &transaction;

        let new_release = release::ActiveModel {
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
        }
        .insert(tx)
        .await?;

        let entity_create_time = &new_release.created_at;

        let history = release_history::ActiveModel::from(new_release.clone())
            .insert(tx)
            .await?;

        let change_request = change_request::ActiveModel {
            id: ActiveValue::NotSet,
            request_status: ActiveValue::Set(ChangeRequestStatus::Approved),
            request_type: ActiveValue::Set(ChangeRequestType::Create),
            entity_type: ActiveValue::Set(EntityType::Release),
            created_at: entity_create_time.into_active_value(),
            handled_at: entity_create_time.into_active_value(),
        }
        .insert(tx)
        .await?;

        change_request_history::Model {
            change_request_id: change_request.id,
            history_id: history.id,
            description,
        }
        .into_active_model()
        .insert(tx)
        .await?;

        let change_request_users = vec![
            ChangeRequestUserType::Author,
            ChangeRequestUserType::Approver,
        ]
        .into_iter()
        .map(|t| change_request_user::ActiveModel {
            id: ActiveValue::NotSet,
            change_request_id: change_request.id.into_active_value(),
            user_id: author_id.into_active_value(),
            user_type: t.into_active_value(),
        });

        change_request_user::Entity::insert_many(change_request_users)
            .exec(tx)
            .await?;

        // Question: Should check here?
        if artists.is_empty() {
            return Err(ServiceError::InvalidField {
                field: "artist".into(),
                expected: "Vec<i32> && len > 1".into(),
                accepted: format!("{:?}", artists),
            });
        }

        Self::create_release_artist()
            .release_id(new_release.id)
            .history_id(history.id)
            .artists(artists)
            .transaction(tx)
            .call()
            .await?;

        if !localized_titles.is_empty() {
            Self::create_release_localized_title()
                .release_id(new_release.id)
                .history_id(history.id)
                .titles(localized_titles)
                .transaction(tx)
                .call()
                .await?;
        }

        if !labels.is_empty() {
            Self::create_release_label()
                .release_id(new_release.id)
                .history_id(history.id)
                .labels(labels)
                .transaction(tx)
                .call()
                .await?;
        }

        if !tracks.is_empty() {
            Self::create_release_track()
                .release_id(new_release.id)
                .release_history_id(history.id)
                .tracks(tracks)
                .transaction(tx)
                .call()
                .await?
        }

        if !credits.is_empty() {
            Self::create_release_credit()
                .release_id(new_release.id)
                .history_id(history.id)
                .credits(credits)
                .transaction(tx)
                .call()
                .await?
        }

        transaction.commit().await?;

        Ok(new_release)
    }

    #[builder]
    async fn create_release_artist(
        release_id: i32,
        history_id: i32,
        artists: Vec<i32>,
        transaction: &DatabaseTransaction,
    ) -> Result<(), DbErr> {
        let release_artist = artists.iter().map(|id| {
            release_artist::Model {
                release_id,
                artist_id: *id,
            }
            .into_active_model()
        });

        let release_artist_history = artists.iter().map(|id| {
            release_artist_history::Model {
                history_id,
                artist_id: *id,
            }
            .into_active_model()
        });

        release_artist::Entity::insert_many(release_artist)
            .exec(transaction)
            .await?;

        release_artist_history::Entity::insert_many(release_artist_history)
            .exec(transaction)
            .await?;

        Ok(())
    }

    #[builder]
    async fn create_release_localized_title(
        release_id: i32,
        history_id: i32,
        titles: Vec<LocalizedTitle>,
        transaction: &DatabaseTransaction,
    ) -> Result<(), DbErr> {
        let models = titles.iter().map(|item| {
            release_localized_title::Model {
                release_id,
                ..item.into()
            }
            .into_active_model()
        });

        let history_models = titles.iter().map(|item| {
            release_localized_title_history::Model {
                history_id,
                ..item.into()
            }
            .into_active_model()
        });

        release_localized_title::Entity::insert_many(models)
            .exec(transaction)
            .await?;
        release_localized_title_history::Entity::insert_many(history_models)
            .exec(transaction)
            .await?;

        Ok(())
    }

    #[builder]
    async fn create_release_label(
        release_id: i32,
        history_id: i32,
        labels: Vec<i32>,
        transaction: &DatabaseTransaction,
    ) -> Result<(), DbErr> {
        let models = labels.iter().map(|id| {
            release_label::Model {
                release_id,
                label_id: *id,
            }
            .into_active_model()
        });

        let history_models = labels.iter().map(|id| {
            release_label_history::Model {
                history_id,
                label_id: *id,
            }
            .into_active_model()
        });

        release_label::Entity::insert_many(models)
            .exec(transaction)
            .await?;

        release_label_history::Entity::insert_many(history_models)
            .exec(transaction)
            .await?;

        Ok(())
    }

    #[builder]
    async fn create_release_track(
        release_id: i32,
        release_history_id: i32,
        tracks: Vec<Track>,
        transaction: &DatabaseTransaction,
    ) -> Result<(), DbErr> {
        let tx = transaction;
        let (linked, unlinked): (Vec<_>, Vec<_>) =
            tracks.into_iter().partition_map(|track| match track {
                Track::Linked(t) => Either::Left(t),
                Track::Unlinked(t) => Either::Right(t),
            });

        // TODO: Create a pr or wait someone to implement it
        // https://github.com/SeaQL/sea-orm/issues/1862
        let tracks = future::try_join_all(unlinked.into_iter().map(
            |track| async move {
                let model = song::ActiveModel {
                    id: NotSet,
                    title: track.title.into_active_value(),
                    duration: match track.duration {
                        Some(t) => Some(t.to_string()).into_active_value(),
                        None => NotSet,
                    },
                    created_at: NotSet,
                    updated_at: NotSet,
                }
                .insert(tx)
                .await?;

                Ok::<LinkedTrack, DbErr>(LinkedTrack {
                    title: model.title.into(),
                    song_id: model.id,
                    artist: track.artist,
                    track_number: track.track_number,
                    track_order: track.track_order,
                    duration: track.duration,
                })
            },
        ))
        .await?
        .into_iter()
        .chain(linked.into_iter());

        let track_task = tracks.into_iter().map(|track| async move {
            let track_model = release_track::ActiveModel {
                id: ActiveValue::NotSet,
                release_id: release_id.into_active_value(),
                song_id: track.song_id.into_active_value(),
                track_order: track.track_order.into_active_value(),
                track_number: Into::<Option<String>>::into(
                    track.track_number.clone(),
                )
                .into_active_value(),
                title: track.title.clone().into_active_value(),
            };

            let track_history_model = release_track_history::ActiveModel {
                id: NotSet,
                release_history_id: release_history_id.into_active_value(),
                song_id: track.song_id.into_active_value(),
                track_order: track.track_order.into_active_value(),
                track_number: Into::<Option<String>>::into(track.track_number)
                    .into_active_value(),
                title: track.title.into_active_value(),
            };

            let track_id = release_track::Entity::insert(track_model)
                .exec(tx)
                .await?
                .last_insert_id;

            let track_history_id =
                release_track_history::Entity::insert(track_history_model)
                    .exec(tx)
                    .await?
                    .last_insert_id;

            let artist_model = track.artist.iter().map(|artist_id| {
                release_track_artist::Model {
                    track_id,
                    artist_id: *artist_id,
                }
                .into_active_model()
            });

            let artist_history_model = track.artist.iter().map(|artist_id| {
                release_track_artist_history::Model {
                    track_history_id,
                    artist_id: *artist_id,
                }
                .into_active_model()
            });

            release_track_artist::Entity::insert_many(artist_model)
                .exec(tx)
                .await?;
            release_track_artist_history::Entity::insert_many(
                artist_history_model,
            )
            .exec(tx)
            .await?;

            Ok::<(), DbErr>(())
        });

        future::try_join_all(track_task).await?;

        Ok(())
    }

    #[builder]
    async fn create_release_credit(
        release_id: i32,
        history_id: i32,
        credits: Vec<Credit>,
        transaction: &DatabaseTransaction,
    ) -> Result<(), DbErr> {
        let credit_model =
            credits.iter().map(|credit| release_credit::ActiveModel {
                id: NotSet,
                artist_id: credit.artist_id.into_active_value(),
                release_id: release_id.into_active_value(),
                role_id: credit.role_id.into_active_value(),
                on: Set(credit.on.clone()),
            });

        let credit_history_model =
            credits
                .iter()
                .map(|credit| release_credit_history::ActiveModel {
                    id: NotSet,
                    artist_id: credit.artist_id.into_active_value(),
                    release_history_id: history_id.into_active_value(),
                    role_id: credit.role_id.into_active_value(),
                    on: Set(credit.on.clone()),
                });

        release_credit::Entity::insert_many(credit_model)
            .exec(transaction)
            .await?;
        release_credit_history::Entity::insert_many(credit_history_model)
            .exec(transaction)
            .await?;

        Ok(())
    }
}
