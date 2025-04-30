use sea_orm::DbErr;
use serde::Serialize;
use strum_macros::{EnumCount, EnumIter, EnumString};
use utoipa::ToSchema;

#[derive(
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    EnumIter,
    EnumCount,
    EnumString,
    strum_macros::Display,
    Serialize,
    ToSchema,
)]
pub enum UserRoleEnum {
    Admin = 1,
    Moderator = 2,
    User = 3,
}

impl From<UserRoleEnum> for i32 {
    fn from(val: UserRoleEnum) -> Self {
        match val {
            UserRoleEnum::Admin => 1,
            UserRoleEnum::Moderator => 2,
            UserRoleEnum::User => 3,
        }
    }
}

impl From<UserRole> for UserRoleEnum {
    fn from(val: UserRole) -> Self {
        (&val).into()
    }
}

impl From<&UserRole> for UserRoleEnum {
    fn from(val: &UserRole) -> Self {
        Self::try_from(val.id).expect("Invalid user role id from database")
    }
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct UserRole {
    pub id: i32,
    #[schema(value_type = UserRoleEnum)]
    pub name: String,
}

impl TryFrom<entity::user_role::Model> for UserRole {
    type Error = DbErr;
    fn try_from(value: entity::user_role::Model) -> Result<Self, Self::Error> {
        Ok(UserRoleEnum::try_from(value.role_id)?.into())
    }
}

impl From<UserRoleEnum> for UserRole {
    fn from(value: UserRoleEnum) -> Self {
        Self {
            id: value.into(),
            name: value.to_string(),
        }
    }
}
