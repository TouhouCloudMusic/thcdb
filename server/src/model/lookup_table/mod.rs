use sea_orm::{
    ConnectionTrait, DatabaseConnection, DbErr, EntityTrait, IntoActiveModel,
};
use strum::IntoEnumIterator;
use user_role::{LookupTableCheckResult, UserRole};

use crate::service::user::upsert_admin_acc;

pub mod language;
pub mod user_role;

pub async fn check_database_lookup_tables(
    db: &DatabaseConnection,
) -> Result<(), DbErr> {
    UserRole::check_and_sync(db).await?;
    language::upsert_langauge(db).await?;

    upsert_admin_acc(db).await;

    Ok(())
}

pub trait LookupTableEnum
where
    Self: Sized,
{
    fn as_id(&self) -> i32;

    fn try_from_id(id: i32) -> Result<Self, ()>;
}

trait ValidateLookupTable
where
    Self: Sized
        + IntoEnumIterator
        + Into<<Self::Entity as EntityTrait>::ActiveModel>
        + PartialEq<<Self::Entity as EntityTrait>::Model>,
    <Self::Entity as EntityTrait>::Model:
        IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>,
{
    type Entity: EntityTrait;

    type ConflictData;
    async fn check(
        db: &impl ConnectionTrait,
    ) -> Result<LookupTableCheckResult<Self::ConflictData>, DbErr> {
        check_impl::<Self::Entity, Self>(db).await
    }

    fn try_from_model(
        model: &<Self::Entity as EntityTrait>::Model,
    ) -> Result<Self, ()>;

    fn new_conflict_data(
        self,
        model: &<Self::Entity as EntityTrait>::Model,
    ) -> Self::ConflictData;

    fn display_conflict(data: Self::ConflictData) -> String;

    async fn init(db: &impl ConnectionTrait) -> Result<(), DbErr> {
        let models = Self::iter()
            .map(Into::<<Self::Entity as EntityTrait>::ActiveModel>::into);

        Self::Entity::insert_many(models)
            .exec_without_returning(db)
            .await?;

        Ok(())
    }

    async fn sync(db: &impl ConnectionTrait) -> Result<(), DbErr> {
        let models = Self::iter()
            .map(Into::<<Self::Entity as EntityTrait>::ActiveModel>::into);

        Self::Entity::insert_many(models)
            .on_conflict_do_nothing()
            .exec_without_returning(db)
            .await?;

        Ok(())
    }

    async fn check_and_sync(db: &impl ConnectionTrait) -> Result<(), DbErr> {
        match Self::check(db).await? {
            LookupTableCheckResult::Conflict(data) => {
                panic!("{}", Self::display_conflict(data))
            }
            LookupTableCheckResult::Empty => Self::init(db).await,
            LookupTableCheckResult::Unsync => Self::sync(db).await,
            LookupTableCheckResult::Ok => Ok(()),
        }
    }
}

async fn check_impl<Entity, Enum>(
    db: &impl ConnectionTrait,
) -> Result<LookupTableCheckResult<Enum::ConflictData>, DbErr>
where
    Entity: EntityTrait,
    Entity::Model: IntoActiveModel<Entity::ActiveModel>,
    Enum: ValidateLookupTable<Entity = Entity> + PartialEq<Entity::Model>,
{
    let models = Entity::find().all(db).await.unwrap();

    if models.is_empty() {
        return Ok(LookupTableCheckResult::Empty);
    }

    for model in &models {
        if let Ok(r#enum) = Enum::try_from_model(model) {
            if r#enum != *model {
                return Ok(LookupTableCheckResult::Conflict(
                    r#enum.new_conflict_data(model),
                ));
            }
        }
    }

    let unsync = || {
        models.iter().all(|model| {
            Enum::try_from_model(model).map_or(true, |r#enum| r#enum == *model)
        })
    };

    let res = if Enum::iter().count() != models.len() && unsync() {
        LookupTableCheckResult::Unsync
    } else {
        LookupTableCheckResult::Ok
    };

    Ok(res)
}
