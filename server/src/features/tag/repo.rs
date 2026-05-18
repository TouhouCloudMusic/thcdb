use entity::{
    correction_revision, tag, tag_alternative_name,
    tag_alternative_name_history, tag_history, tag_relation,
    tag_relation_history,
};
use infra_db::SeaOrmTxRepo;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveValue, ModelTrait, QueryFilter, QueryOrder,
};

use crate::features::tag::model::{NewTag, NewTagRelation};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::BrokenEntityReference;

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewTag,
) -> Result<i32, DatabaseError> {
    create_impl(data, repo.conn())
        .await
        .map(|tag| tag.id)
        .db_operation("create tag")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewTag,
) -> Result<i32, DatabaseError> {
    create_history_impl(data, repo.conn())
        .await
        .map(|tag| tag.id)
        .db_operation("create tag history")
}

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DatabaseError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction.id,
        })?;

    let history = tag_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "tag history",
            id: revision.entity_history_id,
        })?;

    tag::ActiveModel {
        id: Set(correction.entity_id),
        name: Set(history.name),
        r#type: Set(history.r#type),
        short_description: Set(history.short_description),
        description: Set(history.description),
    }
    .update(tx)
    .await?;

    let tag_id = correction.entity_id;
    let history_id = revision.entity_history_id;

    update_alt_names(tag_id, history_id, tx).await?;
    update_relations(tag_id, history_id, tx).await?;

    Ok(())
}

async fn create_impl(
    data: &NewTag,
    tx: &DatabaseTransaction,
) -> Result<tag::Model, DbErr> {
    let tag_model = tag::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        r#type: Set(data.r#type),
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
    };

    let tag = tag_model.insert(tx).await?;

    if let Some(alt_names) = &data.alt_names {
        create_alt_name(tag.id, alt_names, tx).await?;
    }

    if let Some(relations) = &data.relations {
        create_relation(tag.id, relations, tx).await?;
    }

    Ok(tag)
}

async fn create_history_impl(
    data: &NewTag,
    tx: &DatabaseTransaction,
) -> Result<tag_history::Model, DbErr> {
    let history_model = tag_history::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        r#type: Set(data.r#type),
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
    };

    let history = history_model.insert(tx).await?;

    if let Some(alt_names) = &data.alt_names {
        create_alt_name_history(history.id, alt_names, tx).await?;
    }

    if let Some(relations) = &data.relations {
        create_relation_history(history.id, relations, tx).await?;
    }

    Ok(history)
}

async fn create_alt_name(
    tag_id: i32,
    alt_names: &[String],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let active_models =
        alt_names
            .iter()
            .map(|name| tag_alternative_name::ActiveModel {
                id: NotSet,
                tag_id: Set(tag_id),
                name: Set(name.clone()),
                is_origin_language: Set(false),
                language_id: Set(None),
            });

    tag_alternative_name::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_alt_name_history(
    history_id: i32,
    alt_names: &[String],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let active_models = alt_names.iter().map(|name| {
        tag_alternative_name_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            name: Set(name.clone()),
            is_origin_language: Set(false),
            language_id: Set(None),
        }
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
) -> Result<(), DbErr> {
    if relations.is_empty() {
        return Ok(());
    }

    let active_models =
        relations.iter().map(|relation| tag_relation::ActiveModel {
            tag_id: Set(tag_id),
            related_tag_id: Set(relation.related_tag_id),
            r#type: Set(relation.r#type),
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
) -> Result<(), DbErr> {
    if relations.is_empty() {
        return Ok(());
    }

    let active_models =
        relations
            .iter()
            .map(|relation| tag_relation_history::ActiveModel {
                history_id: Set(history_id),
                related_tag_id: Set(relation.related_tag_id),
                r#type: Set(relation.r#type),
            });

    tag_relation_history::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_alt_names(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    tag_alternative_name::Entity::delete_many()
        .filter(tag_alternative_name::Column::TagId.eq(tag_id))
        .exec(tx)
        .await?;

    let alt_names = tag_alternative_name_history::Entity::find()
        .filter(tag_alternative_name_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if alt_names.is_empty() {
        return Ok(());
    }

    let models =
        alt_names
            .iter()
            .map(|alt_name| tag_alternative_name::ActiveModel {
                id: NotSet,
                tag_id: Set(tag_id),
                name: Set(alt_name.name.clone()),
                is_origin_language: Set(alt_name.is_origin_language),
                language_id: Set(alt_name.language_id),
            });

    tag_alternative_name::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_relations(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    tag_relation::Entity::delete_many()
        .filter(tag_relation::Column::TagId.eq(tag_id))
        .exec(tx)
        .await?;

    let relations = tag_relation_history::Entity::find()
        .filter(tag_relation_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if relations.is_empty() {
        return Ok(());
    }

    let models = relations.iter().map(|relation| tag_relation::ActiveModel {
        tag_id: Set(tag_id),
        related_tag_id: Set(relation.related_tag_id),
        r#type: Set(relation.r#type),
    });

    tag_relation::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}
