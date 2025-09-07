use entity::release;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QuerySelect,
};
use snafu::ResultExt;

use super::impls::*;
use crate::domain::release::model::Release;
use crate::domain::release::repo::{Filter, Repo};
use crate::domain::repository::Connection;

impl<T> Repo for T
where
    T: Connection,
    T::Conn: ConnectionTrait,
{
    async fn find_one(
        &self,
        filter: Filter,
    ) -> Result<Option<Release>, Box<dyn std::error::Error + Send + Sync>> {
        Ok(find_many_impl(filter.into_select().limit(1), self.conn())
            .await?
            .into_iter()
            .next())
    }

    async fn find_many(
        &self,
        // TODO: many filter
        filter: Filter,
    ) -> Result<Vec<Release>, Box<dyn std::error::Error + Send + Sync>> {
        find_many_impl(filter.into_select(), self.conn())
            .await
            .boxed()
    }

    async fn exist(
        &self,
        id: i32,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        Ok(release::Entity::find()
            .select_only()
            .expr(1)
            .filter(release::Column::Id.eq(id))
            .count(self.conn())
            .await
            .boxed()?
            > 0)
    }
}
