use std::collections::{HashMap, HashSet};

use entity::tag::Column::Name;
use entity::{tag, tag_alternative_name, tag_relation};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use sea_query::extension::postgres::PgBinOper::{
    Similarity, SimilarityDistance,
};
use sea_query::{ExprTrait, Func};

use crate::domain::tag::{AlternativeName, TagRef, TagRelation};
use crate::features::tag::model::Tag;
use crate::infra::database::sea_orm::{SeaOrmRepository, utils};

pub(super) async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Tag>, DbErr> {
    let select = tag::Entity::find().filter(tag::Column::Id.eq(id));

    find_many_impl(select, &repo.conn)
        .await
        .map(|mut tags| tags.pop())
}

pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
    keyword: &str,
) -> Result<Vec<Tag>, DbErr> {
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

    find_many_impl(select, &repo.conn).await
}

pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: super::TagFilter,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Tag>, DbErr> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        return find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await;
    }

    let select = filter.into_select();
    utils::find_many_paginated(
        select,
        pagination,
        tag::Column::Id,
        |select| find_many_impl(select, &repo.conn),
        |tag: &Tag| tag.id,
    )
    .await
}

async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: super::TagFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Tag>, DbErr> {
    use entity::enums::EntityType;

    use crate::shared::http::SortDirection;

    let entity_ids =
        crate::infra::database::sea_orm::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Tag,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await?;

    if entity_ids.is_empty() {
        return Ok(crate::domain::shared::Paginated::nothing());
    }

    let mut select =
        tag::Entity::find().filter(tag::Column::Id.is_in(entity_ids.clone()));

    if let Some(tag_types) = filter.tag_types {
        select = select.filter(tag::Column::Type.is_in(tag_types));
    }

    let mut tags = find_many_impl(select, &repo.conn).await?;

    tags = crate::infra::database::sea_orm::utils::sort_by_id_list(
        tags,
        &entity_ids,
        |tag| tag.id,
    );

    Ok(utils::paginate_by_id(tags, &pagination, |tag| tag.id))
}

async fn find_many_impl(
    select: sea_orm::Select<tag::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Tag>, sea_orm::DbErr> {
    let tags = select.all(db).await?;
    let alt_names = tags.load_many(tag_alternative_name::Entity, db).await?;
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

async fn load_tag_relations(
    tags: &[tag::Model],
    db: &impl ConnectionTrait,
) -> Result<Vec<Vec<TagRelation>>, sea_orm::DbErr> {
    let relations = tag_relation::Entity::find()
        .filter(
            tag_relation::Column::TagId.is_in(tags.iter().map(|tag| tag.id)),
        )
        .all(db)
        .await?;

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
            .await?
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
