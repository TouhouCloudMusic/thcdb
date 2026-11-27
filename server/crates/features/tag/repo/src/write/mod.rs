use entity::{
    tag, tag_alternative_name, tag_alternative_name_history, tag_history,
    tag_relation, tag_relation_history,
};
use infra_db::DatabaseTransaction;
use infra_db::error::DatabaseError;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, DbErr, EntityTrait, IntoActiveValue};

mod model;

pub use model::{NewTag, NewTagRelation};

#[infra_db::observe("tag.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    data: &NewTag,
) -> Result<i32, DatabaseError> {
    Ok(create_impl(data, tx).await.map(|tag| tag.id)?)
}

#[infra_db::observe("tag.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    data: &NewTag,
) -> Result<i32, DatabaseError> {
    Ok(create_history_impl(data, tx).await.map(|tag| tag.id)?)
}

async fn create_impl(
    data: &NewTag,
    tx: &DatabaseTransaction,
) -> Result<tag::Model, DbErr> {
    infra_db::trace("tag.insert_with_relations", async {
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
    })
    .await
}

async fn create_history_impl(
    data: &NewTag,
    tx: &DatabaseTransaction,
) -> Result<tag_history::Model, DbErr> {
    infra_db::trace("tag.insert_history_with_relations", async {
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
    })
    .await
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
