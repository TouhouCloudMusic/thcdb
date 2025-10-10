use entity::credit_role;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

use crate::domain::Connection;
use crate::domain::credit_role::QueryKind;

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
pub struct CommonFilter {}

pub enum FindManyFilter {
    Name(String),
}

pub(super) async fn find_one<R, K>(
    repo: &R,
    id: i32,
    common: CommonFilter,
) -> Result<Option<K::Output>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
    K: QueryKind,
{
    let _ = common;

    credit_role::Entity::find_by_id(id)
        .one(repo.conn())
        .await
        .map(|role| role.map(Into::into))
}

pub(super) async fn find_many<R, K>(
    repo: &R,
    filter: FindManyFilter,
    common: CommonFilter,
) -> Result<Vec<K::Output>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
    K: QueryKind,
{
    let _ = common;

    let roles = match filter {
        FindManyFilter::Name(name) => {
            let search_term = Func::lower(name);

            credit_role::Entity::find()
                .filter(
                    Func::lower(credit_role::Column::Name.into_expr())
                        .binary(PgBinOper::Similarity, search_term.clone()),
                )
                .order_by_asc(
                    Func::lower(credit_role::Column::Name.into_expr())
                        .binary(PgBinOper::SimilarityDistance, search_term),
                )
                .all(repo.conn())
                .await?
        }
    };

    Ok(roles.into_iter().map(Into::into).collect())
}
