use entity::credit_role::Model as DbCreditRole;
use sea_orm::DbErr;

use crate::domain::shared::query_kind;
use crate::features::credit_role::model::NewCreditRole;
use crate::infra::database::sea_orm::{
    SeaOrmTxRepo, credit_role as credit_role_impls,
};

pub trait QueryKind {
    type Output: From<DbCreditRole>;
}

impl QueryKind for query_kind::Ref {
    type Output = crate::domain::credit_role::CreditRoleRef;
}
impl QueryKind for query_kind::Summary {
    type Output = crate::domain::credit_role::CreditRoleSummary;
}
impl QueryKind for query_kind::Full {
    type Output = crate::domain::credit_role::CreditRole;
}

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &NewCreditRole,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &NewCreditRole,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewCreditRole,
) -> Result<i32, DbErr> {
    Ok(credit_role_impls::create_credit_role(data, repo.conn())
        .await?
        .id)
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewCreditRole,
) -> Result<i32, DbErr> {
    Ok(
        credit_role_impls::create_credit_role_history(data, repo.conn())
            .await?
            .id,
    )
}
