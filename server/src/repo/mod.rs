use std::marker::PhantomData;
use std::sync::LazyLock;

use sea_orm::prelude::Expr;
use sea_orm::sea_query::{self, Alias, IntoCondition};
use sea_orm::{
    DatabaseConnection, DbErr, EntityTrait, IntoActiveModel, PaginatorTrait,
    PrimaryKeyTrait, QueryFilter,
};

use crate::utils::Pipe;

pub mod artist;
pub mod correction;
pub mod event;
pub mod label;
pub mod release;
pub mod song;
pub mod tag;
pub mod user;

static ID_EXPR: LazyLock<sea_query::Expr> =
    LazyLock::new(|| Expr::col(Alias::new("id")));

#[derive(Clone)]
pub struct SeaOrmRepository<T = ()> {
    conn: DatabaseConnection,
    _type: PhantomData<T>,
}

impl<T> SeaOrmRepository<T> {
    pub const fn new(conn: DatabaseConnection) -> Self {
        Self {
            conn,
            _type: PhantomData,
        }
    }
}

impl<T> SeaOrmRepository<T>
where
    T: EntityTrait,
    T::Model: IntoActiveModel<T::ActiveModel> + Send + Sync,
    i32: Into<<<T as EntityTrait>::PrimaryKey as PrimaryKeyTrait>::ValueType>,
{
    async fn create(&self, model: T::ActiveModel) -> Result<T::Model, DbErr> {
        T::insert(model).exec_with_returning(&self.conn).await
    }

    async fn update(&self, model: T::ActiveModel) -> Result<T::Model, DbErr> {
        T::update(model).exec(&self.conn).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<(), DbErr> {
        self.delete_by_cond(ID_EXPR.clone().eq(id)).await
    }

    async fn delete_by_ids(&self, ids: Vec<i32>) -> Result<(), DbErr> {
        self.delete_by_cond(ID_EXPR.clone().is_in(ids)).await
    }

    async fn delete_by_cond(
        &self,
        cond: impl IntoCondition,
    ) -> Result<(), DbErr> {
        T::delete_many()
            .filter(cond)
            .exec(&self.conn)
            .await
            .map(|_| ())
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<T::Model>, DbErr> {
        self.find_one(ID_EXPR.clone().eq(id)).await
    }

    async fn find_one(
        &self,
        cond: impl IntoCondition,
    ) -> Result<Option<T::Model>, DbErr> {
        T::find().filter(cond).one(&self.conn).await
    }

    async fn find_many(
        &self,
        cond: impl IntoCondition,
    ) -> Result<Vec<T::Model>, DbErr> {
        T::find().filter(cond).all(&self.conn).await
    }

    async fn find_with_pagination(
        &self,
        page: u64,
        page_size: u64,
        cond: Option<impl IntoCondition>,
    ) -> Result<(Vec<T::Model>, u64), DbErr> {
        let selector = T::find().pipe(|s| {
            if let Some(cond) = cond {
                s.filter(cond)
            } else {
                s
            }
        });

        let paginator = selector.paginate(&self.conn, page_size);
        let num_pages = paginator.num_pages().await?;

        let result = paginator
            .fetch_page(page - 1)
            .await
            .map(|p| (p, num_pages))?;

        Ok(result)
    }
}
