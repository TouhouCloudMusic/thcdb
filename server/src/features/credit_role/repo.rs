use entity::credit_role::Model as DbCreditRole;

use crate::domain::shared::query_kind;
use crate::features::credit_role::model::NewCreditRole;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
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
    async fn create(&self, data: &NewCreditRole) -> Result<i32, DatabaseError>;

    async fn create_history(
        &self,
        data: &NewCreditRole,
    ) -> Result<i32, DatabaseError>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), DatabaseError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewCreditRole,
) -> Result<i32, DatabaseError> {
    credit_role_impls::create_credit_role(data, repo.conn())
        .await
        .map(|role| role.id)
        .with_operation("create credit role")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewCreditRole,
) -> Result<i32, DatabaseError> {
    credit_role_impls::create_credit_role_history(data, repo.conn())
        .await
        .map(|role| role.id)
        .with_operation("create credit role history")
}
