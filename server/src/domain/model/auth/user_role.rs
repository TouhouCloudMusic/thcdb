use sea_orm::DbErr;
use serde::Serialize;
use strum_macros::{EnumCount, EnumIter, EnumString};
use utoipa::ToSchema;

#[derive(
    Clone,
    Copy,
    Debug,
    EnumString,
    EnumIter,
    EnumCount,
    strum_macros::Display,
    Serialize,
    ToSchema,
)]
pub enum UserRole {
    Admin = 1,
    Moderator = 2,
    User = 3,
}

impl From<UserRole> for i32 {
    fn from(val: UserRole) -> Self {
        match val {
            UserRole::Admin => 1,
            UserRole::Moderator => 2,
            UserRole::User => 3,
        }
    }
}

impl TryFrom<i32> for UserRole {
    type Error = DbErr;
    fn try_from(value: i32) -> Result<Self, Self::Error> {
        Ok(match value {
            1 => Self::Admin,
            2 => Self::Moderator,
            3 => Self::User,
            _ => Err(DbErr::Custom("Invalid user role".to_string()))?,
        })
    }
}
