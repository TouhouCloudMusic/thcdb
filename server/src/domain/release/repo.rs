use crate::domain::repository::{Connection, Transaction};
use crate::error::InfraError;

pub enum Filter {
    Id(i32),
    Keyword(String),
}

pub trait Repo: Connection {
    async fn find_one(
        &self,
        filter: Filter,
    ) -> Result<Option<super::model::Release>, InfraError>;
    async fn find_many(
        &self,
        filter: Filter,
    ) -> Result<Vec<super::model::Release>, InfraError>;
}

pub trait TxRepo: Transaction + Repo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &super::model::NewRelease,
    ) -> Result<i32, InfraError>;

    async fn create_history(
        &self,
        data: &super::model::NewRelease,
    ) -> Result<i32, InfraError>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), InfraError>;
}
