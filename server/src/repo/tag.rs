use entity::sea_orm_active_enums::EntityType;
use entity::{
    tag, tag_alternative_name, tag_alternative_name_history, tag_history,
    tag_relation, tag_relation_history,
};
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, DatabaseTransaction, EntityTrait};

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
) -> Result<(), GeneralRepositoryError> {
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
