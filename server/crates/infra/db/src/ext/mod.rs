use ::sea_orm::{
    ConnectionTrait, DbErr, EntityTrait, IntoActiveModel, RuntimeErr,
};

pub mod maybe_loader;
pub mod pg_func_ext;

fn query_error<T>(message: T) -> DbErr
where
    T: Into<String>,
{
    DbErr::Query(RuntimeErr::Internal(message.into()))
}

pub trait InsertMany<T: EntityTrait> {
    type Entity: EntityTrait;
    async fn insert_many(
        self,
        db: &impl ConnectionTrait,
    ) -> Result<Vec<<Self::Entity as EntityTrait>::Model>, ::sea_orm::DbErr>
    where
        <Self::Entity as EntityTrait>::Model:
            IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>;
}

impl<E, I> InsertMany<E> for I
where
    E: EntityTrait,
    I: IntoIterator<Item = E::ActiveModel>,
{
    type Entity = E;
    async fn insert_many(
        self,
        db: &impl ConnectionTrait,
    ) -> Result<Vec<<Self::Entity as EntityTrait>::Model>, ::sea_orm::DbErr>
    where
        <Self::Entity as EntityTrait>::Model:
            IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>,
    {
        Self::Entity::insert_many(self)
            .exec_with_returning_many(db)
            .await
    }
}
