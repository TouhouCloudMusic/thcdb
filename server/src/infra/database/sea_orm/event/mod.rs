use entity::sea_orm_active_enums::AlternativeNameType;
use entity::{
    correction_revision, event, event_alternative_name,
    event_alternative_name_history, event_history,
};
use itertools::{Itertools, izip};
use sea_orm::ActiveValue::NotSet;
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, IntoActiveValue, LoaderTrait, ModelTrait, QueryFilter,
    QueryOrder, Set,
};

use crate::domain::event::model::{AlternativeName, Event, NewEvent};
use crate::domain::event::repo::{Repo, TxRepo};
use crate::domain::repository::Connection;
use crate::domain::shared::model::DateWithPrecision;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_by_id(&self, id: i32) -> Result<Option<Event>, Self::Error> {
        find_many_impl(event::Column::Id.eq(id), self.conn())
            .await
            .map(|x| x.into_iter().next())
    }

    async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Event>, Self::Error> {
        find_many_impl(event::Column::Name.contains(keyword), self.conn()).await
    }
}

async fn find_many_impl(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<Event>, DbErr> {
    let events = event::Entity::find()
        .filter(cond)
        .order_by_desc(event::Column::Id)
        .all(db)
        .await?;

    let alt_names =
        events.load_many(event_alternative_name::Entity, db).await?;

    let res = izip!(events, alt_names)
        .map(|(event, alt_name)| Event {
            id: event.id,
            name: event.name,
            short_description: Some(event.short_description),
            description: Some(event.description),
            start_date: match (event.start_date, event.start_date_precision) {
                (Some(date), precision) => Some(DateWithPrecision {
                    value: date,
                    precision,
                }),
                _ => None,
            },
            end_date: match (event.end_date, event.end_date_precision) {
                (Some(date), precision) => Some(DateWithPrecision {
                    value: date,
                    precision,
                }),
                _ => None,
            },
            alternative_names: alt_name
                .into_iter()
                .map(|an| AlternativeName {
                    id: an.id,
                    name: an.name,
                })
                .collect_vec(),
        })
        .collect_vec();

    Ok(res)
}

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(&self, data: &NewEvent) -> Result<i32, Self::Error> {
        create_event_and_relations(data, self.conn())
            .await
            .map(|x| x.id)
    }

    async fn create_history(
        &self,
        data: &NewEvent,
    ) -> Result<i32, Self::Error> {
        create_event_history_and_relations(data, self.conn())
            .await
            .map(|x| x.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error> {
        apply_correction(correction, self.conn()).await
    }
}

async fn create_event_and_relations(
    data: &NewEvent,
    tx: &DatabaseTransaction,
) -> Result<event::Model, DbErr> {
    let event_model = event::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        short_description: data
            .short_description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
        description: data
            .description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
        start_date: data.start_date.map(|d| d.value).into_active_value(),
        start_date_precision: data
            .start_date
            .map(|d| d.precision)
            .into_active_value(),
        end_date: data.end_date.map(|d| d.value).into_active_value(),
        end_date_precision: data
            .end_date
            .map(|d| d.precision)
            .into_active_value(),
    };

    let event = event_model.insert(tx).await?;

    if let Some(alt_names) = &data.alternative_names {
        create_alt_names(event.id, alt_names, tx).await?;
    }

    Ok(event)
}

async fn create_event_history_and_relations(
    data: &NewEvent,
    tx: &DatabaseTransaction,
) -> Result<event_history::Model, DbErr> {
    let history_model = event_history::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        short_description: data
            .short_description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
        description: data
            .description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
        start_date: data.start_date.map(|d| d.value).into_active_value(),
        start_date_precision: data
            .start_date
            .map(|d| d.precision)
            .into_active_value(),
        end_date: data.end_date.map(|d| d.value).into_active_value(),
        end_date_precision: data
            .end_date
            .map(|d| d.precision)
            .into_active_value(),
    };

    let history = history_model.insert(tx).await?;

    if let Some(alt_names) = &data.alternative_names {
        create_alt_names_history(history.id, alt_names, tx).await?;
    }

    Ok(history)
}

async fn create_alt_names(
    event_id: i32,
    alt_names: &[String],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let models =
        alt_names
            .iter()
            .map(|name| event_alternative_name::ActiveModel {
                id: NotSet,
                event_id: event_id.into_active_value(),
                name: name.clone().into_active_value(),
                r#type: Set(AlternativeNameType::Alias),
                language_id: Set(Option::<i32>::None),
            });

    event_alternative_name::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_alt_names_history(
    history_id: i32,
    alt_names: &[String],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let models = alt_names.iter().map(|name| {
        event_alternative_name_history::ActiveModel {
            id: NotSet,
            history_id: history_id.into_active_value(),
            name: name.clone().into_active_value(),
            r#type: Set(AlternativeNameType::Alias),
            language_id: Set(Option::<i32>::None),
        }
    });

    event_alternative_name_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn apply_correction(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Correction revision not found".to_string())
        })?;

    let history = event_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| DbErr::Custom("Event history not found".to_string()))?;

    // Convert history to ActiveModel
    let active_model = event::ActiveModel {
        id: Set(correction.entity_id),
        name: Set(history.name),
        short_description: Set(history.short_description),
        description: Set(history.description),
        start_date: Set(history.start_date),
        start_date_precision: Set(history.start_date_precision),
        end_date: Set(history.end_date),
        end_date_precision: Set(history.end_date_precision),
    };

    active_model.update(tx).await?;

    let event_id = correction.entity_id;

    update_alt_names(event_id, revision.entity_history_id, tx).await?;

    Ok(())
}

async fn update_alt_names(
    event_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete all existing alternative names
    event_alternative_name::Entity::delete_many()
        .filter(event_alternative_name::Column::EventId.eq(event_id))
        .exec(tx)
        .await?;

    // Then retrieve all alternative names from history
    let alt_names = event_alternative_name_history::Entity::find()
        .filter(
            event_alternative_name_history::Column::HistoryId.eq(history_id),
        )
        .all(tx)
        .await?;

    // Skip if there are no alternative names to create
    if alt_names.is_empty() {
        return Ok(());
    }

    // Create new models from history data
    let models =
        alt_names
            .iter()
            .map(|alt_name| event_alternative_name::ActiveModel {
                id: NotSet,
                event_id: Set(event_id),
                name: Set(alt_name.name.clone()),
                r#type: Set(alt_name.r#type),
                language_id: Set(alt_name.language_id),
            });

    // Insert the new alternative names
    event_alternative_name::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}
