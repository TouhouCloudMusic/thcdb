use entity::role;
use sea_orm::ActiveValue::Set;
use sea_orm::{ConnectionTrait, DbErr, EntityTrait, IntoActiveModel};
use strum::IntoEnumIterator;
use strum_macros::{EnumCount, EnumIter, EnumString};

pub enum LookupTableCheckResult<T> {
    Ok,
    Empty,
    Unsync,
    Conflict(T),
}

impl<T> From<T> for LookupTableCheckResult<T> {
    fn from(val: T) -> Self {
        Self::Conflict(val)
    }
}

trait ValidateLookUpTable
where
    Self: Sized
        + IntoEnumIterator
        + Into<<Self::Entity as EntityTrait>::ActiveModel>,
    <Self::Entity as EntityTrait>::Model:
        IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>,
{
    type ConflictData;
    async fn check(
        db: &impl ConnectionTrait,
    ) -> Result<LookupTableCheckResult<Self::ConflictData>, DbErr>;

    type Entity: EntityTrait;

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

pub trait LookUpTableEnum
where
    Self: Sized,
{
    fn as_id(&self) -> i32;

    fn try_from_id(id: i32) -> Result<Self, ()>;
}

#[derive(
    Clone, Copy, EnumString, EnumIter, EnumCount, strum_macros::Display,
)]
pub enum UserRole {
    Admin,
    Moderator,
    User,
}

impl PartialEq<role::Model> for UserRole {
    fn eq(&self, other: &role::Model) -> bool {
        self.as_id() == other.id && self.to_string() == other.name
    }
}

pub struct UserRoleConflict {
    pub id: i32,
    pub db_name: String,
    pub enum_name: String,
}

impl From<UserRole> for role::ActiveModel {
    fn from(val: UserRole) -> Self {
        Self {
            id: Set(val.as_id()),
            name: Set(val.to_string()),
        }
    }
}

impl ValidateLookUpTable for UserRole {
    type ConflictData = UserRoleConflict;
    async fn check(
        db: &impl ConnectionTrait,
    ) -> Result<LookupTableCheckResult<Self::ConflictData>, DbErr> {
        check_impl::<role::Entity, Self>(db).await
    }

    type Entity = role::Entity;

    fn try_from_model(
        model: &<Self::Entity as EntityTrait>::Model,
    ) -> Result<Self, ()> {
        Self::try_from_id(model.id)
    }

    fn new_conflict_data(
        self,
        model: &<Self::Entity as EntityTrait>::Model,
    ) -> Self::ConflictData {
        Self::ConflictData {
            id: model.id,
            db_name: model.name.clone(),
            enum_name: self.to_string(),
        }
    }

    fn display_conflict(
        Self::ConflictData {
            id,
            db_name,
            enum_name,
        }: Self::ConflictData,
    ) -> String {
        format!(
            "User role definition conflicts with database records.\n\
            On:\n\
            - ID: {id}\n\
            - Database value: '{db_name}'\n\
            - Enum value: '{enum_name}'"
        )
    }
}

impl LookUpTableEnum for UserRole {
    fn as_id(&self) -> i32 {
        match self {
            Self::Admin => 1,
            Self::Moderator => 2,
            Self::User => 3,
        }
    }

    fn try_from_id(id: i32) -> Result<Self, ()> {
        let res = match id {
            1 => Self::Admin,
            2 => Self::Moderator,
            3 => Self::User,
            _ => {
                return Err(());
            }
        };

        Ok(res)
    }
}

async fn check_impl<Entity, Enum>(
    db: &impl ConnectionTrait,
) -> Result<LookupTableCheckResult<Enum::ConflictData>, DbErr>
where
    Entity: EntityTrait,
    Enum: ValidateLookUpTable<Entity = Entity>
        + IntoEnumIterator
        + Copy
        + PartialEq<Entity::Model>,
    Entity::Model: IntoActiveModel<Entity::ActiveModel>,
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

pub async fn check_database_lookup_tables(
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    UserRole::check_and_sync(db).await?;

    Ok(())
}
