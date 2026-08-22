use entity::release;
use infra_db::SeaOrmRepository;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Select,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func, NullOrdering};

use super::filter::ReleaseSortField;
use crate::features::release::model::Release;
use crate::features::release::repo::find_many_impl;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;
use crate::shared::http::CorrectionSortField;

#[derive(Clone, Debug)]
pub enum FindReleaseFilter {
    Id(i32),
    Keyword(String),
    ReleaseTypes(Vec<entity::sea_orm_active_enums::ReleaseType>),
}

pub(crate) async fn find_one(
    repo: &SeaOrmRepository,
    filter: FindReleaseFilter,
) -> Result<Option<Release>, DatabaseError> {
    find_many_impl(filter_into_select(filter).limit(1), &repo.conn)
        .await
        .map(|mut releases| releases.pop())
        .db_operation("find release by id")
}

pub(crate) async fn find_many(
    repo: &SeaOrmRepository,
    filter: FindReleaseFilter,
) -> Result<Vec<Release>, DatabaseError> {
    find_many_impl(filter_into_select(filter), &repo.conn)
        .await
        .db_operation("find releases")
}

pub(crate) async fn exists(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<bool, DatabaseError> {
    release::Entity::find()
        .select_only()
        .expr(1)
        .filter(release::Column::Id.eq(id))
        .count(db)
        .await
        .map(|count: u64| count > 0)
        .db_operation("check release exists")
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

pub(crate) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: super::ReleaseFilter,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<Release>, DatabaseError> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        return match sort_field {
            ReleaseSortField::ReleaseDate => {
                find_sorted_by_release_date(
                    repo,
                    filter,
                    sort_direction,
                    pagination,
                )
                .await
            }
            ReleaseSortField::CreatedAt => {
                find_sorted_by_correction(
                    repo,
                    filter,
                    CorrectionSortField::CreatedAt,
                    sort_direction,
                    pagination,
                )
                .await
            }
            ReleaseSortField::UpdatedAt => {
                find_sorted_by_correction(
                    repo,
                    filter,
                    CorrectionSortField::UpdatedAt,
                    sort_direction,
                    pagination,
                )
                .await
            }
        }
        .db_operation("explore releases");
    }

    let select = filter.into_select();
    utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        release::Column::Id,
        |select| async {
            find_many_impl(select, &repo.conn)
                .await
                .db_operation("load releases")
        },
    )
    .await
    .db_operation("explore releases")
}

async fn find_sorted_by_release_date(
    repo: &SeaOrmRepository,
    filter: super::ReleaseFilter,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<Release>, DatabaseError> {
    let select = filter.into_select().order_by_with_nulls(
        release::Column::ReleaseDate,
        sort_direction.into(),
        NullOrdering::Last,
    );

    utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        release::Column::Id,
        |select| async {
            find_many_impl(select, &repo.conn)
                .await
                .db_operation("load releases")
        },
    )
    .await
}

async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: super::ReleaseFilter,
    sort_field: CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<Release>, DatabaseError> {
    use entity::enums::EntityType;

    let entity_ids =
        crate::infra::database::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Release,
            sort_field,
            sort_direction.into(),
        )
        .await
        .db_operation("list correction-sorted release ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let mut select = release::Entity::find()
        .filter(release::Column::Id.is_in(entity_ids.clone()));

    if let Some(release_types) = filter.release_types {
        select =
            select.filter(release::Column::ReleaseType.is_in(release_types));
    }

    let mut releases = find_many_impl(select, &repo.conn)
        .await
        .db_operation("load releases")?;

    releases = crate::infra::database::utils::sort_by_id_list(
        releases,
        &entity_ids,
        |release| release.id,
    );

    Ok(utils::page_from_items(releases, &pagination))
}
