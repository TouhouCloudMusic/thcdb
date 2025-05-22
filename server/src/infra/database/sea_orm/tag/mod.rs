use entity::{
    tag, tag_alternative_name, tag_alternative_name_history, tag_history,
    tag_relation, tag_relation_history,
};
use itertools::izip;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, IntoActiveValue, LoaderTrait, QueryFilter,
};

use crate::domain::repository::Connection;
use crate::domain::tag::model::{
    AlternativeName, NewTag, NewTagRelation, Tag, TagRelation,
};
use crate::domain::tag::{Repo, TxRepo};

mod impls;
use impls::*;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_by_id(&self, id: i32) -> Result<Option<Tag>, Self::Error> {
        find_many_impl(tag::Column::Id.eq(id), self.conn())
            .await
            .map(|x| x.into_iter().next())
    }

    async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Tag>, Self::Error> {
        find_many_impl(tag::Column::Name.contains(keyword), self.conn()).await
    }
}

async fn find_many_impl(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<Tag>, DbErr> {
    let tags = tag::Entity::find().filter(cond).all(db).await?;

    let alt_names = tags.load_many(tag_alternative_name::Entity, db).await?;

    let relations = tag_relation::Entity::find()
        .filter(
            tag_relation::Column::TagId.is_in(tags.iter().map(|tag| tag.id)),
        )
        .all(db)
        .await?;

    Ok(izip!(tags, alt_names)
        .map(|(tag, alt_names)| Tag {
            id: tag.id,
            name: tag.name,
            r#type: tag.r#type,
            short_description: Some(tag.short_description),
            description: Some(tag.description),
            alt_names: alt_names
                .into_iter()
                .map(|an| AlternativeName {
                    id: an.id,
                    name: an.name,
                })
                .collect(),
            relations: relations
                .iter()
                .filter(|relation| relation.tag_id == tag.id)
                .map(|r| TagRelation {
                    related_tag_id: r.related_tag_id,
                    r#type: r.r#type,
                })
                .collect(),
        })
        .collect())
}

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(&self, data: &NewTag) -> Result<i32, Self::Error> {
        let tag = create_tag_impl(data, self.conn()).await?;

        Ok(tag.id)
    }

    async fn create_history(&self, data: &NewTag) -> Result<i32, Self::Error> {
        create_history_impl(data, self.conn()).await.map(|x| x.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error> {
        apply_correction(correction, self.conn()).await
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
