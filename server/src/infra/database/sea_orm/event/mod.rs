use entity::sea_orm_active_enums::AlternativeNameType;
use entity::{
    correction_revision, event, event_alternative_name,
    event_alternative_name_history, event_history,
};
use sea_orm::ActiveValue::NotSet;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveValue, ModelTrait, QueryFilter, QueryOrder, Set,
};
use snafu::ResultExt;

use crate::domain::event::{NewEvent, TxRepo};

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(
        &self,
        data: &NewEvent,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        create_event_and_relations(data, self.conn())
            .await
            .map(|x| x.id)
            .boxed()
    }

    async fn create_history(
        &self,
        data: &NewEvent,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        create_event_history_and_relations(data, self.conn())
            .await
            .map(|x| x.id)
            .boxed()
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        apply_correction(correction, self.conn()).await.boxed()
    }
}

pub(crate) async fn create_event_and_relations(
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
        location_country: data
            .location
            .as_ref()
            .and_then(|l| l.country.clone())
            .into_active_value(),
        location_province: data
            .location
            .as_ref()
            .and_then(|l| l.province.clone())
            .into_active_value(),
        location_city: data
            .location
            .as_ref()
            .and_then(|l| l.city.clone())
            .into_active_value(),
    };

    let event = event_model.insert(tx).await?;

    if let Some(alt_names) = &data.alternative_names {
        create_alt_names(event.id, alt_names, tx).await?;
    }

    Ok(event)
}

pub(crate) async fn create_event_history_and_relations(
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
        location_country: data
            .location
            .as_ref()
            .and_then(|l| l.country.clone())
            .into_active_value(),
        location_province: data
            .location
            .as_ref()
            .and_then(|l| l.province.clone())
            .into_active_value(),
        location_city: data
            .location
            .as_ref()
            .and_then(|l| l.city.clone())
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

pub(crate) async fn apply_correction(
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
        location_country: Set(history.location_country),
        location_province: Set(history.location_province),
        location_city: Set(history.location_city),
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
