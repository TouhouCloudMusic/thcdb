use entity::credit_role::Model as DbCreditRole;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

use super::model::*;
use crate::domain::repository::{Connection, Transaction};
use crate::domain::*;

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

pub enum FindManyFilter {
    Name(String),
}

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
pub struct CommonFilter {}

pub trait Repo: Connection {
    async fn find_one<K: QueryKind>(
        &self,
        id: i32,
        common: CommonFilter,
    ) -> Result<Option<K::Output>, Self::Error>;

    async fn find_many<K: QueryKind>(
        &self,
        filter: FindManyFilter,
        common: CommonFilter,
    ) -> Result<Vec<K::Output>, Self::Error>;
}

pub trait TxRepo: Repo + Transaction
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewCreditRole) -> Result<i32, Self::Error>;

    async fn create_history(
        &self,
        data: &NewCreditRole,
    ) -> Result<i32, Self::Error>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error>;
}
