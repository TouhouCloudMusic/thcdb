use entity::{
    tag, tag_alternative_name, tag_alternative_name_history, tag_history,
    tag_relation, tag_relation_history,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, DatabaseTransaction, DbErr, EntityTrait, IntoActiveValue,
};
use snafu::ResultExt;

use crate::domain::tag::{NewTag, NewTagRelation, TxRepo};

mod impls;
use impls::*;

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(
        &self,
        data: &NewTag,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let tag = create_tag_impl(data, self.conn()).await?;

        Ok(tag.id)
    }

    async fn create_history(
        &self,
        data: &NewTag,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        create_history_impl(data, self.conn())
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

async fn create_tag_impl(
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
