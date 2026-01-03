use entity::credit_role;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter, QueryOrder};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

use crate::features::credit_role::model::{CreditRole, CreditRoleSummary};
use crate::infra::database::sea_orm::SeaOrmRepository;

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
pub struct CommonFilter {}

pub enum FindManyFilter {
    Name(String),
}

pub(super) async fn find_one(
    repo: &SeaOrmRepository,
    id: i32,
    common: CommonFilter,
) -> Result<Option<CreditRole>, DbErr> {
    let _ = common;

    credit_role::Entity::find_by_id(id)
        .one(&repo.conn)
        .await
        .map(|role| role.map(Into::into))
}

pub(super) async fn find_many_summary(
    repo: &SeaOrmRepository,
    filter: FindManyFilter,
    common: CommonFilter,
) -> Result<Vec<CreditRoleSummary>, DbErr> {
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
                .all(&repo.conn)
                .await?
        }
    };

    Ok(roles.into_iter().map(Into::into).collect())
}
