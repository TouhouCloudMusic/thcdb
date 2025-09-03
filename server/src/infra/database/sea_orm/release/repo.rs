use entity::release;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, PaginatorTrait,
    QueryFilter, QuerySelect,
};

use super::impls::*;
use crate::domain::release::model::Release;
use crate::domain::release::repo::{Filter, Repo};
use crate::domain::repository::Connection;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_one(
        &self,
        filter: Filter,
    ) -> Result<Option<Release>, Self::Error> {
        Ok(find_many_impl(filter.into_select().limit(1), self.conn())
            .await?
            .into_iter()
            .next())
    }

    async fn find_many(
        &self,
        // TODO: many filter
        filter: Filter,
    ) -> Result<Vec<Release>, Self::Error> {
        find_many_impl(filter.into_select(), self.conn()).await
    }

    async fn exist(&self, id: i32) -> Result<bool, Self::Error> {
        Ok(release::Entity::find()
            .select_only()
            .expr(1)
            .filter(release::Column::Id.eq(id))
            .count(self.conn())
            .await?
            > 0)
    }
}
