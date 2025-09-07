use crate::domain::repository::{Connection, Transaction};

pub enum Filter {
    Id(i32),
    Keyword(String),
}

pub trait Repo: Connection {
    async fn find_one(
        &self,
        filter: Filter,
    ) -> Result<
        Option<super::model::Release>,
        Box<dyn std::error::Error + Send + Sync>,
    >;
    async fn find_many(
        &self,
        filter: Filter,
    ) -> Result<
        Vec<super::model::Release>,
        Box<dyn std::error::Error + Send + Sync>,
    >;
    async fn exist(
        &self,
        id: i32,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>>;
}

pub trait TxRepo: Transaction + Repo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &super::model::NewRelease,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &super::model::NewRelease,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
