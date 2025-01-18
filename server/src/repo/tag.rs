use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, EntityType,
};
use entity::{
    correction, correction_revision, tag, tag_alternative_name,
    tag_alternative_name_history, tag_history, tag_relation,
    tag_relation_history,
};
use itertools::Itertools;
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityName,
    EntityOrSelect, EntityTrait, ModelTrait, QueryFilter, QueryOrder,
};

use super::correction::user::utils::add_co_author_if_updater_not_author;
use crate::dto::correction::Metadata;
use crate::dto::tag::{AltName, NewTag, NewTagRelation};
use crate::error::GeneralRepositoryError;
use crate::repo;

pub async fn create(
    data: NewTag,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<tag::Model, GeneralRepositoryError> {
    let tag = save_tag_and_link_relation(&data, tx).await?;

    let correction = repo::correction::create_self_approval()
        .author_id(correction_metadata.author_id)
        .entity_type(EntityType::Tag)
        .entity_id(tag.id)
        .db(tx)
        .call()
        .await?;

    save_tag_history_and_link_relation(
        &data,
        correction.id,
        correction_metadata.description,
        tx,
    )
    .await?;

    Ok(tag)
}

pub async fn create_update_correction(
    tag_id: i32,
    data: NewTag,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<(), GeneralRepositoryError> {
    let correction = repo::correction::create()
        .author_id(correction_metadata.author_id)
        .status(CorrectionStatus::Pending)
        .r#type(CorrectionType::Update)
        .entity_type(EntityType::Tag)
        .entity_id(tag_id)
        .db(tx)
        .call()
        .await?;

    save_tag_history_and_link_relation(
        &data,
        correction.id,
        correction_metadata.description,
        tx,
    )
    .await?;

    Ok(())
}

pub async fn update_update_correction(
    correction: correction::Model,
    data: NewTag,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<(), GeneralRepositoryError> {
    add_co_author_if_updater_not_author(
        correction.id,
        correction_metadata.author_id,
        tx,
    )
    .await?;

    save_tag_history_and_link_relation(
        &data,
        correction.id,
        correction_metadata.description,
        tx,
    )
    .await?;

    Ok(())
}

pub(super) async fn apply_correction(
    correction: correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), GeneralRepositoryError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| GeneralRepositoryError::RelatedEntityNotFound {
            entity_name: correction_revision::Entity.table_name(),
        })?;

    let history = tag_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| GeneralRepositoryError::RelatedEntityNotFound {
            entity_name: tag_history::Entity.table_name(),
        })?;

    let mut active_model = tag::ActiveModel::from(&history);
    active_model.id = Set(correction.entity_id);
    active_model.update(tx).await?;

    let tag_id = correction.entity_id;

    update_alt_name(tag_id, history.id, tx).await?;
    update_relation(tag_id, history.id, tx).await?;

    Ok(())
}

// Relations of tag:
// - alternative name
// - relation
async fn save_tag_and_link_relation(
    data: &NewTag,
    tx: &DatabaseTransaction,
) -> Result<tag::Model, GeneralRepositoryError> {
    let tag = tag::ActiveModel::from(data).insert(tx).await?;

    create_alt_name(tag.id, &data.alt_names, tx).await?;
    create_relation(tag.id, &data.relations, tx).await?;

    Ok(tag)
}

async fn save_tag_history_and_link_relation(
    data: &NewTag,
    correction_id: i32,
    correction_desc: String,
    tx: &DatabaseTransaction,
) -> Result<tag_history::Model, GeneralRepositoryError> {
    let history = tag_history::ActiveModel::from(data).insert(tx).await?;

    repo::correction::link_history()
        .correction_id(correction_id)
        .entity_history_id(history.id)
        .description(correction_desc)
        .db(tx)
        .call()
        .await?;

    create_alt_name_history(history.id, &data.alt_names, tx).await?;
    create_relation_history(history.id, &data.relations, tx).await?;

    Ok(history)
}

async fn create_alt_name(
    tag_id: i32,
    alt_names: &[AltName],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let active_models = alt_names.iter().map(|alt_name| {
        let mut active_model =
            tag_alternative_name::ActiveModel::from(alt_name);
        active_model.tag_id = Set(tag_id);

        active_model
    });

    tag_alternative_name::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_alt_name(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    tag_alternative_name::Entity::delete_many()
        .filter(tag_alternative_name::Column::TagId.eq(tag_id))
        .exec(tx)
        .await?;

    let alt_names = tag_alternative_name_history::Entity
        .select()
        .filter(tag_alternative_name_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(Into::into)
        .collect_vec();

    create_alt_name(tag_id, &alt_names, tx).await
}

async fn create_alt_name_history(
    history_id: i32,
    alt_names: &[AltName],
    tx: &DatabaseTransaction,
) -> Result<(), GeneralRepositoryError> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let active_models = alt_names.iter().map(|alt_name| {
        let mut active_model =
            tag_alternative_name_history::ActiveModel::from(alt_name);
        active_model.history_id = Set(history_id);

        active_model
    });

    tag_alternative_name_history::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_relation(
    tag_id: i32,
    relations: &[NewTagRelation],
    tx: &DatabaseTransaction,
) -> Result<(), GeneralRepositoryError> {
    if relations.is_empty() {
        return Ok(());
    }

    let active_models = relations.iter().map(|relation| {
        let mut active_model = tag_relation::ActiveModel::from(relation);
        active_model.tag_id = Set(tag_id);

        active_model
    });

    tag_relation::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_relation(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), GeneralRepositoryError> {
    tag_relation::Entity::delete_many()
        .filter(tag_relation::Column::TagId.eq(tag_id))
        .exec(tx)
        .await?;

    let relations = tag_relation_history::Entity
        .select()
        .filter(tag_relation_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(Into::into)
        .collect_vec();

    create_relation(tag_id, &relations, tx).await
}

async fn create_relation_history(
    history_id: i32,
    relations: &[NewTagRelation],
    tx: &DatabaseTransaction,
) -> Result<(), GeneralRepositoryError> {
    if relations.is_empty() {
        return Ok(());
    }

    let active_models = relations.iter().map(|relation| {
        let mut active_model =
            tag_relation_history::ActiveModel::from(relation);
        active_model.history_id = Set(history_id);

        active_model
    });

    tag_relation_history::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}
