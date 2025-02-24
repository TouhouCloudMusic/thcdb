use entity::sea_orm_active_enums::EntityType;
use entity::{
    correction, correction_revision, tag, tag_alternative_name,
    tag_alternative_name_history, tag_history, tag_relation,
    tag_relation_history,
};
use itertools::{Itertools, izip};
use sea_orm::ActiveValue::Set;
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityName, EntityOrSelect, EntityTrait, LoaderTrait, ModelTrait,
    QueryFilter, QueryOrder,
};

use crate::dto::correction::Metadata;
use crate::dto::tag::{AltName, NewTag, TagRelation, TagResponse};
use crate::error::RepositoryError;
use crate::repo;
use crate::utils::MapInto;

pub async fn find_by_id(
    id: i32,
    db: &impl ConnectionTrait,
) -> Result<TagResponse, RepositoryError> {
    find_many(tag::Column::Id.eq(id), db)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| RepositoryError::EntityNotFound {
            entity_name: tag::Entity.table_name(),
        })
}

pub async fn find_by_keyword(
    kw: impl Into<String>,
    db: &impl ConnectionTrait,
) -> Result<Vec<TagResponse>, RepositoryError> {
    find_many(tag::Column::Name.contains(kw), db).await
}

async fn find_many(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<TagResponse>, RepositoryError> {
    let tags = tag::Entity::find().filter(cond).all(db).await?;

    let alt_names = tags.load_many(tag_alternative_name::Entity, db).await?;

    let relations = tag_relation::Entity::find()
        .filter(
            tag_relation::Column::TagId.is_in(tags.iter().map(|tag| tag.id)),
        )
        .all(db)
        .await?;

    Ok(izip!(tags, alt_names)
        .map(|(tag, alt_names)| TagResponse {
            id: tag.id,
            name: tag.name,
            r#type: tag.r#type,
            short_description: tag.short_description,
            description: tag.description,
            alt_names: alt_names.map_into(),
            relations: relations
                .iter()
                .filter(|relation| relation.tag_id == tag.id)
                .map_into()
                .collect(),
        })
        .collect())
}

pub async fn create(
    user_id: i32,
    data: NewTag,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<tag::Model, RepositoryError> {
    let tag = save_tag_and_link_relation(&data, tx).await?;

    let history = save_tag_history_and_link_relation(&data, tx).await?;

    repo::correction::create_self_approval()
        .author_id(user_id)
        .entity_type(EntityType::Tag)
        .entity_id(tag.id)
        .history_id(history.id)
        .description(correction_metadata.description)
        .call(tx)
        .await?;

    Ok(tag)
}

pub async fn create_correction(
    tag_id: i32,
    user_id: i32,
    data: NewTag,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let history = save_tag_history_and_link_relation(&data, tx).await?;

    repo::correction::create()
        .author_id(user_id)
        .entity_id(tag_id)
        .entity_type(EntityType::Tag)
        .history_id(history.id)
        .description(correction_metadata.description)
        .call(tx)
        .await?;

    Ok(())
}

pub async fn update_correction(
    user_id: i32,
    correction: correction::Model,
    data: NewTag,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let history = save_tag_history_and_link_relation(&data, tx).await?;

    repo::correction::update()
        .author_id(user_id)
        .history_id(history.id)
        .correction_id(correction.id)
        .description(correction_metadata.description)
        .call(tx)
        .await?;

    Ok(())
}

pub(super) async fn apply_correction(
    correction: correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: correction_revision::Entity.table_name(),
        })?;

    let history = tag_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
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
) -> Result<tag::Model, RepositoryError> {
    let tag = tag::ActiveModel::from(data).insert(tx).await?;

    create_alt_name(tag.id, &data.alt_names, tx).await?;
    create_relation(tag.id, &data.relations, tx).await?;

    Ok(tag)
}

async fn save_tag_history_and_link_relation(
    data: &NewTag,
    tx: &DatabaseTransaction,
) -> Result<tag_history::Model, RepositoryError> {
    let history = tag_history::ActiveModel::from(data).insert(tx).await?;

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
) -> Result<(), RepositoryError> {
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
    relations: &[TagRelation],
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
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
) -> Result<(), RepositoryError> {
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
    relations: &[TagRelation],
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
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
