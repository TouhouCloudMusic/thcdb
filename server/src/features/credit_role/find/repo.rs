use entity::credit_role;
use infra_db::SeaOrmRepository;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

use crate::features::credit_role::model::{CreditRole, CreditRoleSummary};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
pub struct CommonFilter {}

pub enum FindManyFilter {
    Name(String),
}

pub(super) async fn find_one(
    repo: &SeaOrmRepository,
    id: i32,
    common: CommonFilter,
) -> Result<Option<CreditRole>, DatabaseError> {
    let _ = common;

    credit_role::Entity::find_by_id(id)
        .one(&repo.conn)
        .await
        .map(|role| role.map(Into::into))
        .db_operation("find credit role by id")
}

pub(super) async fn find_many_summary(
    repo: &SeaOrmRepository,
    filter: FindManyFilter,
    common: CommonFilter,
) -> Result<Vec<CreditRoleSummary>, DatabaseError> {
    let result: Result<Vec<CreditRoleSummary>, DatabaseError> = async {
        let _ = common;

        let roles = match filter {
            FindManyFilter::Name(name) if name.is_empty() => {
                credit_role::Entity::find()
                    .order_by_asc(credit_role::Column::Name)
                    .order_by_asc(credit_role::Column::Id)
                    .all(&repo.conn)
                    .await
                    .db_operation("load credit role summaries")?
            }
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
                    .await
                    .db_operation("load credit role summaries")?
            }
        };

        Ok(roles.into_iter().map(Into::into).collect())
    }
    .await;

    result.db_operation("find credit role summaries")
}

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::EntityTrait;

    use super::*;
    use crate::infra::integration_test::test_connection;

    #[tokio::test]
    async fn empty_string_keyword_lists_all_credit_roles() -> anyhow::Result<()>
    {
        let conn = test_connection().await?;
        let role = credit_role::Entity::insert(credit_role::ActiveModel {
            id: NotSet,
            name: Set("empty keyword directory role alpha".to_owned()),
            short_description: Set("alpha".to_owned()),
            description: Set("alpha".to_owned()),
        })
        .exec_with_returning(&conn)
        .await?;
        let repo = SeaOrmRepository::new(conn);

        let summaries = find_many_summary(
            &repo,
            FindManyFilter::Name(String::new()),
            CommonFilter {},
        )
        .await?;
        assert!(summaries.iter().any(|summary| summary.id == role.id));

        Ok(())
    }
}
