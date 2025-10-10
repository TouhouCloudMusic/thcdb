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

#[derive(Clone, Debug)]
pub enum Filter {
    Id(i32),
    Keyword(String),
}

pub(crate) async fn find_one<R>(
    repo: &R,
    filter: Filter,
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
    filter: Filter,
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

fn filter_into_select(filter: Filter) -> Select<release::Entity> {
    match filter {
        Filter::Id(id) => {
            release::Entity::find().filter(release::Column::Id.eq(id))
        }
        Filter::Keyword(keyword) => {
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
    }
}
