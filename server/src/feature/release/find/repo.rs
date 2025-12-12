use entity::release;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, Select,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::domain::Connection;
use crate::domain::release::Release;
use crate::infra::database::sea_orm::release::impls::find_many_impl;
use crate::infra::database::sea_orm::utils;

#[derive(Clone, Debug)]
pub enum FindReleaseFilter {
    Id(i32),
    Keyword(String),
    ReleaseTypes(Vec<entity::sea_orm_active_enums::ReleaseType>),
}

pub(crate) async fn find_one<R>(
    repo: &R,
    filter: FindReleaseFilter,
) -> Result<Option<Release>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    find_many_impl(filter_into_select(filter).limit(1), repo.conn())
        .await
        .map(|mut releases| releases.pop())
}

pub(crate) async fn find_many<R>(
    repo: &R,
    filter: FindReleaseFilter,
) -> Result<Vec<Release>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    find_many_impl(filter_into_select(filter), repo.conn()).await
}

pub(crate) async fn exists<R>(repo: &R, id: i32) -> Result<bool, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    release::Entity::find()
        .select_only()
        .expr(1)
        .filter(release::Column::Id.eq(id))
        .count(repo.conn())
        .await
        .map(|count: u64| count > 0)
}

fn filter_into_select(filter: FindReleaseFilter) -> Select<release::Entity> {
    match filter {
        FindReleaseFilter::Id(id) => {
            release::Entity::find().filter(release::Column::Id.eq(id))
        }
        FindReleaseFilter::Keyword(keyword) => {
            let search_term = Func::lower(keyword);
            release::Entity::find()
                .filter(
                    Func::lower(release::Column::Title.into_expr())
                        .binary(PgBinOper::Similarity, search_term.clone()),
                )
                .order_by_asc(
                    Func::lower(release::Column::Title.into_expr())
                        .binary(PgBinOper::SimilarityDistance, search_term),
                )
        }
        FindReleaseFilter::ReleaseTypes(release_types) => {
            release::Entity::find()
                .filter(release::Column::ReleaseType.is_in(release_types))
        }
    }
}

pub(crate) async fn find_by_filter<R>(
    repo: &R,
    filter: super::ReleaseFilter,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Release>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
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
        release::Column::Id,
        |select| find_many_impl(select, repo.conn()),
        |release: &Release| release.id,
    )
    .await
}

async fn find_sorted_by_correction<R>(
    repo: &R,
    filter: super::ReleaseFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Release>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    use entity::enums::EntityType;

    use crate::shared::http::SortDirection;

    let entity_ids =
        crate::infra::database::sea_orm::utils::correction_sorted_entity_ids(
            repo.conn(),
            EntityType::Release,
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

    let mut select = release::Entity::find()
        .filter(release::Column::Id.is_in(entity_ids.clone()));

    if let Some(release_types) = filter.release_types {
        select =
            select.filter(release::Column::ReleaseType.is_in(release_types));
    }

    let mut releases = find_many_impl(select, repo.conn()).await?;

    releases = crate::infra::database::sea_orm::utils::sort_by_id_list(
        releases,
        &entity_ids,
        |release| release.id,
    );

    Ok(utils::paginate_by_id(releases, &pagination, |release| {
        release.id
    }))
}
