use entity::sea_orm_active_enums::AlternativeNameType;
use entity::{
    correction_revision, event, event_alternative_name,
    event_alternative_name_history, event_history,
};
use infra_db::SeaOrmTxRepo;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    IntoActiveValue, ModelTrait, QueryFilter, QueryOrder,
};

use crate::features::event::model::NewEvent;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::BrokenEntityReference;

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewEvent,
) -> Result<i32, DatabaseError> {
    create_event_and_relations(data, repo.conn())
        .await
        .map(|event| event.id)
        .db_operation("create event")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewEvent,
) -> Result<i32, DatabaseError> {
    create_event_history_and_relations(data, repo.conn())
        .await
        .map(|event| event.id)
        .db_operation("create event history")
}

async fn create_event_and_relations(
    data: &NewEvent,
    conn: &impl ConnectionTrait,
) -> Result<event::Model, DbErr> {
    let event = event::ActiveModel::from(data).insert(conn).await?;

    if let Some(alt_names) = &data.alternative_names {
        create_alt_names(event.id, alt_names, conn).await?;
    }

    Ok(event)
}

async fn create_event_history_and_relations(
    data: &NewEvent,
    conn: &impl ConnectionTrait,
) -> Result<event_history::Model, DbErr> {
    let history = event_history::ActiveModel::from(data).insert(conn).await?;

    if let Some(alt_names) = &data.alternative_names {
        create_alt_names_history(history.id, alt_names, conn).await?;
    }

    Ok(history)
}

impl From<&NewEvent> for event::ActiveModel {
    fn from(data: &NewEvent) -> Self {
        Self {
            id: NotSet,
            name: Set(data.name.to_string()),
            short_description: Set(data
                .short_description
                .clone()
                .unwrap_or_default()),
            description: Set(data.description.clone().unwrap_or_default()),
            start_date: Set(data.start_date.map(|d| d.value)),
            start_date_precision: data
                .start_date
                .map(|d| d.precision)
                .into_active_value(),
            end_date: Set(data.end_date.map(|d| d.value)),
            end_date_precision: data
                .end_date
                .map(|d| d.precision)
                .into_active_value(),
            location_country: Set(data
                .location
                .as_ref()
                .and_then(|l| l.country.clone())),
            location_province: Set(data
                .location
                .as_ref()
                .and_then(|l| l.province.clone())),
            location_city: Set(data
                .location
                .as_ref()
                .and_then(|l| l.city.clone())),
        }
    }
}

impl From<&NewEvent> for event_history::ActiveModel {
    fn from(data: &NewEvent) -> Self {
        Self {
            id: NotSet,
            name: Set(data.name.to_string()),
            short_description: Set(data
                .short_description
                .clone()
                .unwrap_or_default()),
            description: Set(data.description.clone().unwrap_or_default()),
            start_date: Set(data.start_date.map(|d| d.value)),
            start_date_precision: data
                .start_date
                .map(|d| d.precision)
                .into_active_value(),
            end_date: Set(data.end_date.map(|d| d.value)),
            end_date_precision: data
                .end_date
                .map(|d| d.precision)
                .into_active_value(),
            location_country: Set(data
                .location
                .as_ref()
                .and_then(|l| l.country.clone())),
            location_province: Set(data
                .location
                .as_ref()
                .and_then(|l| l.province.clone())),
            location_city: Set(data
                .location
                .as_ref()
                .and_then(|l| l.city.clone())),
        }
    }
}

async fn create_alt_names(
    event_id: i32,
    alt_names: &[String],
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let models =
        alt_names
            .iter()
            .map(|name| event_alternative_name::ActiveModel {
                id: NotSet,
                event_id: Set(event_id),
                name: Set(name.clone()),
                r#type: Set(AlternativeNameType::Alias),
                language_id: Set(Option::<i32>::None),
            });

    event_alternative_name::Entity::insert_many(models)
        .exec(conn)
        .await?;

    Ok(())
}

async fn create_alt_names_history(
    history_id: i32,
    alt_names: &[String],
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let models = alt_names.iter().map(|name| {
        event_alternative_name_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            name: Set(name.clone()),
            r#type: Set(AlternativeNameType::Alias),
            language_id: Set(Option::<i32>::None),
        }
    });

    event_alternative_name_history::Entity::insert_many(models)
        .exec(conn)
        .await?;

    Ok(())
}

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    conn: &impl ConnectionTrait,
) -> Result<(), DatabaseError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(conn)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction.id,
        })?;

    let history = event_history::Entity::find_by_id(revision.entity_history_id)
        .one(conn)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "event history",
            id: revision.entity_history_id,
        })?;

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

    active_model.update(conn).await?;
    update_alt_names(correction.entity_id, revision.entity_history_id, conn)
        .await?;

    Ok(())
}

async fn update_alt_names(
    event_id: i32,
    history_id: i32,
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    event_alternative_name::Entity::delete_many()
        .filter(event_alternative_name::Column::EventId.eq(event_id))
        .exec(conn)
        .await?;

    let alt_names = event_alternative_name_history::Entity::find()
        .filter(
            event_alternative_name_history::Column::HistoryId.eq(history_id),
        )
        .all(conn)
        .await?;

    if alt_names.is_empty() {
        return Ok(());
    }

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

    event_alternative_name::Entity::insert_many(models)
        .exec(conn)
        .await?;

    Ok(())
}
