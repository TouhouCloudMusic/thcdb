use entity::credit_role;
use infra_db::error::DatabaseError;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::model::{CreditRole, CreditRoleSummary};

#[infra_db::observe("credit_role.find_by_id")]
pub async fn find_by_id(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<CreditRole>, DatabaseError> {
    let role = credit_role::Entity::find_by_id(id).one(db).await?;
    Ok(role.map(Into::into))
}

#[infra_db::observe("credit_role.load_summaries")]
pub async fn find_many_summary(
    db: &impl ConnectionTrait,
    keyword: &str,
) -> Result<Vec<CreditRoleSummary>, DatabaseError> {
    let roles = if keyword.is_empty() {
        credit_role::Entity::find()
            .order_by_asc(credit_role::Column::Name)
            .order_by_asc(credit_role::Column::Id)
            .all(db)
            .await?
    } else {
        let search_term = Func::lower(keyword);

        credit_role::Entity::find()
            .filter(
                Func::lower(credit_role::Column::Name.into_expr())
                    .binary(PgBinOper::Similarity, search_term.clone()),
            )
            .order_by_asc(
                Func::lower(credit_role::Column::Name.into_expr())
                    .binary(PgBinOper::SimilarityDistance, search_term),
            )
            .all(db)
            .await?
    };

    Ok(roles.into_iter().map(Into::into).collect())
}

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use infra_testing::test_connection;
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::EntityTrait;

    use super::*;

    #[tokio::test]
    async fn empty_string_keyword_lists_all_credit_roles() -> anyhow::Result<()>
    {
        let conn = test_connection().await;
        let role = credit_role::Entity::insert(credit_role::ActiveModel {
            id: NotSet,
            name: Set("empty keyword directory role alpha".to_owned()),
            short_description: Set("alpha".to_owned()),
            description: Set("alpha".to_owned()),
        })
        .exec_with_returning(&conn)
        .await?;
        let summaries = find_many_summary(&conn, "").await?;
        assert!(summaries.iter().any(|summary| summary.id == role.id));

        Ok(())
    }
}
