use entity::sea_orm_active_enums::EntityType;
use entity::{
    correction, event, event_alternative_name, event_alternative_name_history,
    event_history,
};
use itertools::{Itertools, izip};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityName, EntityTrait, IntoActiveValue, LoaderTrait, QueryFilter,
    QueryOrder,
};
use tokio::try_join;

use crate::dto::event::{EventCorrection, EventResponse};
use crate::dto::share::{AlternativeName, AlternativeNameResponse};
use crate::error::RepositoryError;
use crate::repo;
use crate::utils::orm::InsertMany;

pub async fn find_by_id(
    id: i32,
    db: &impl ConnectionTrait,
) -> Result<EventResponse, RepositoryError> {
    let event = find_many(event::Column::Id.eq(id), db)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| RepositoryError::EntityNotFound {
            entity_name: event::Entity.table_name(),
        })?;

    Ok(event)
}

pub async fn find_by_keyword(
    keyword: String,
    db: &impl ConnectionTrait,
) -> Result<Vec<EventResponse>, DbErr> {
    find_many(event::Column::Name.contains(keyword), db).await
}

async fn find_many(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<EventResponse>, DbErr> {
    let event = event::Entity::find()
        .filter(cond)
        .order_by_desc(event::Column::Id)
        .all(db)
        .await?;

    let alt_names = event.load_many(event_alternative_name::Entity, db).await?;

    let res = izip!(event, alt_names)
        .map(|(event, alt_name)| EventResponse {
            id: event.id,
            name: event.name,
            short_description: event.short_description,
            description: event.description,
            start_date: event
                .start_date
                .map(|x| (x, event.start_date_precision)),
            end_date: event.end_date.map(|x| (x, event.end_date_precision)),
            alternative_names: alt_name
                .into_iter()
                .map(AlternativeNameResponse::from)
                .collect_vec(),
        })
        .collect_vec();

    Ok(res)
}

pub async fn create(
    user_id: i32,
    data: EventCorrection,
    db: &DatabaseTransaction,
) -> Result<event::Model, DbErr> {
    let event = create_entity_and_relations(&data, db).await?;

    let history = create_entity_history_and_relations(&data, db).await?;

    repo::correction::create_self_approval()
        .author_id(user_id)
        .entity_type(EntityType::Event)
        .entity_id(event.id)
        .history_id(history.id)
        .description(data.correction_metadata.description)
        .call(db)
        .await?;

    Ok(event)
}

pub async fn create_correction(
    user_id: i32,
    event_id: i32,
    data: EventCorrection,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let history = create_entity_history_and_relations(&data, db).await?;

    repo::correction::create()
        .author_id(user_id)
        .entity_id(event_id)
        .history_id(history.id)
        .entity_type(EntityType::Event)
        .description(data.correction_metadata.description)
        .call(db)
        .await?;

    Ok(())
}

pub async fn update_correction(
    user_id: i32,
    correction: correction::Model,
    data: EventCorrection,
    db: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let history = create_entity_history_and_relations(&data, db).await?;

    repo::correction::update()
        .author_id(user_id)
        .history_id(history.id)
        .correction_id(correction.id)
        .description(data.correction_metadata.description)
        .call(db)
        .await?;

    Ok(())
}

pub(super) async fn apply_correction(
    correction: correction::Model,
    db: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let revision =
        repo::correction::revision::find_latest(correction.id, db).await?;

    let history = event_history::Entity::find_by_id(revision.entity_history_id)
        .one(db)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: event_history::Entity.table_name(),
        })?;

    let event_id = correction.entity_id;

    try_join!(
        event::ActiveModel {
            id: event_id.into_active_value(),
            name: history.name.into_active_value(),
            short_description: history.short_description.into_active_value(),
            description: history.description.into_active_value(),
            start_date: history.start_date.into_active_value(),
            start_date_precision: history
                .start_date_precision
                .into_active_value(),
            end_date: history.end_date.into_active_value(),
            end_date_precision: history.end_date_precision.into_active_value(),
        }
        .insert(db),
        update_alt_names(event_id, history.id, db)
    )?;

    Ok(())
}

async fn create_entity_and_relations(
    data: &EventCorrection,
    tx: &DatabaseTransaction,
) -> Result<event::Model, DbErr> {
    let event = event::ActiveModel::from(data).insert(tx).await?;

    create_alt_names(event.id, &data.alternative_names, tx).await?;

    Ok(event)
}

async fn create_entity_history_and_relations(
    data: &EventCorrection,
    tx: &DatabaseTransaction,
) -> Result<event_history::Model, DbErr> {
    let history: event_history::Model =
        event_history::ActiveModel::from(data).insert(tx).await?;

    create_alt_names_history(history.id, &data.alternative_names, tx).await?;

    Ok(history)
}

async fn create_alt_names(
    event_id: i32,
    data: &[AlternativeName],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    data.iter()
        .cloned()
        .map(|alt_name| alt_name.with_entity_id(event_id))
        .map(Into::<event_alternative_name::ActiveModel>::into)
        .insert_many(tx)
        .await?;

    Ok(())
}

async fn create_alt_names_history(
    history_id: i32,
    data: &[AlternativeName],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    data.iter()
        .cloned()
        .map(|alt_name| alt_name.with_entity_id(history_id))
        .map(Into::<event_alternative_name_history::ActiveModel>::into)
        .insert_many(tx)
        .await?;

    Ok(())
}

async fn update_alt_names(
    event_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    event_alternative_name::Entity::delete_many()
        .filter(event_alternative_name::Column::EventId.eq(event_id))
        .exec(tx)
        .await?;

    let data = event_alternative_name_history::Entity::find()
        .filter(
            event_alternative_name_history::Column::HistoryId.eq(history_id),
        )
        .all(tx)
        .await?
        .into_iter()
        .map(AlternativeName::from)
        .collect_vec();

    create_alt_names(event_id, &data, tx).await
}
