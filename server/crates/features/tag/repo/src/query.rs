use std::collections::{HashMap, HashSet};

use entity::sea_orm_active_enums::TagType;
use entity::tag::Column::Name;
use entity::{tag, tag_alternative_name, tag_relation};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder, Select,
};
use sea_query::extension::postgres::PgBinOper::{
    Similarity, SimilarityDistance,
};
use sea_query::{ExprTrait, Func};

use crate::model::{AlternativeName, Tag, TagRef, TagRelation};

pub fn list_select(
    entity_ids: Option<&[i32]>,
    tag_types: Option<Vec<TagType>>,
) -> Select<tag::Entity> {
    let mut select = tag::Entity::find();
    if let Some(entity_ids) = entity_ids {
        select =
            select.filter(tag::Column::Id.is_in(entity_ids.iter().copied()));
    }
    if let Some(tag_types) = tag_types {
        select = select.filter(tag::Column::Type.is_in(tag_types));
    }
    select
}

#[infra_db::observe("tag.load_tag_relations")]
async fn load_tag_relations(
    tags: &[tag::Model],
    db: &impl ConnectionTrait,
) -> Result<Vec<Vec<TagRelation>>, DatabaseError> {
    let relations = tag_relation::Entity::find()
        .filter(
            tag_relation::Column::TagId.is_in(tags.iter().map(|tag| tag.id)),
        )
        .all(db)
        .await
        .db_context("load tag relations")?;

    let mut grouped_relations: HashMap<i32, Vec<tag_relation::Model>> =
        HashMap::new();

    for relation in relations {
        grouped_relations
            .entry(relation.tag_id)
            .or_default()
            .push(relation);
    }

    let relation_models = tags
        .iter()
        .map(|tag| grouped_relations.remove(&tag.id).unwrap_or_default())
        .collect::<Vec<_>>();

    let tag_ids = tags.iter().map(|tag| tag.id).collect::<HashSet<_>>();

    let missing_related_tag_ids = relation_models
        .iter()
        .flat_map(|relations| {
            relations.iter().map(|relation| relation.related_tag_id)
        })
        .filter(|id| !tag_ids.contains(id))
        .collect::<HashSet<_>>();

    let related_tags = if missing_related_tag_ids.is_empty() {
        Vec::new()
    } else {
        tag::Entity::find()
            .filter(tag::Column::Id.is_in(missing_related_tag_ids))
            .all(db)
            .await
            .db_context("load related tags")?
    };

    let mut tag_lookup: HashMap<i32, TagRef> =
        HashMap::with_capacity(tags.len() + related_tags.len());

    for tag in tags {
        tag_lookup.insert(
            tag.id,
            TagRef {
                id: tag.id,
                name: tag.name.clone(),
                r#type: tag.r#type,
            },
        );
    }

    for tag in related_tags {
        tag_lookup.entry(tag.id).or_insert(TagRef {
            id: tag.id,
            name: tag.name,
            r#type: tag.r#type,
        });
    }

    Ok(relation_models
        .into_iter()
        .map(|relations| {
            relations
                .into_iter()
                .filter_map(|relation| {
                    tag_lookup.get(&relation.related_tag_id).cloned().map(
                        |tag| TagRelation {
                            tag,
                            r#type: relation.r#type,
                        },
                    )
                })
                .collect()
        })
        .collect())
}

#[infra_db::observe("tag.load_with_relations")]
async fn find_many_impl(
    select: Select<tag::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Tag>, DatabaseError> {
    let tags = select.all(db).await.db_context("load tags")?;
    let alt_names = tags
        .load_many(tag_alternative_name::Entity, db)
        .await
        .db_context("load tag alternative names")?;
    let tag_relations = load_tag_relations(&tags, db).await?;

    Ok(itertools::izip!(tags, alt_names, tag_relations)
        .map(|(tag, alt_names, relations)| Tag {
            id: tag.id,
            name: tag.name,
            r#type: tag.r#type,
            short_description: tag.short_description,
            description: tag.description,
            alt_names: alt_names
                .into_iter()
                .map(|m| AlternativeName {
                    id: m.id,
                    name: m.name,
                })
                .collect(),
            relations,
        })
        .collect())
}

#[infra_db::observe("tag.find_by_id")]
pub async fn find_by_id(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<Tag>, DatabaseError> {
    let select = tag::Entity::find().filter(tag::Column::Id.eq(id));
    let mut tags = find_many_impl(select, db).await?;
    Ok(tags.pop())
}

#[infra_db::observe("tag.find_by_keyword")]
pub async fn find_by_keyword(
    db: &impl ConnectionTrait,
    keyword: &str,
) -> Result<Vec<Tag>, DatabaseError> {
    let search_term = Func::lower(keyword);

    let select = tag::Entity::find()
        .filter(
            Func::lower(Name.into_expr())
                .binary(Similarity, search_term.clone()),
        )
        .order_by_asc(
            Func::lower(Name.into_expr())
                .binary(SimilarityDistance, search_term),
        );

    Ok(find_many_impl(select, db).await?)
}
