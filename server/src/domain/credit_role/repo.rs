use entity::credit_role::Model as DbCreditRole;

use super::model::*;
use crate::domain::{Transaction, *};

pub trait QueryKind {
    type Output: From<DbCreditRole>;
}

impl QueryKind for query_kind::Ref {
    type Output = CreditRoleRef;
}
impl QueryKind for query_kind::Summary {
    type Output = CreditRoleSummary;
}
impl QueryKind for query_kind::Full {
    type Output = CreditRole;
}

pub trait TxRepo: Transaction
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
