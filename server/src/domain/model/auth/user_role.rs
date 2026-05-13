use serde::{Deserialize, Serialize};
use strum::{EnumCount, EnumIter, EnumString, IntoEnumIterator};
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
    strum::Display,
    Serialize,
    ToSchema,
)]
pub enum UserRoleEnum {
    Admin = 1,
    Moderator = 2,
    User = 3,
}

#[derive(Debug, Clone, Copy, derive_more::Display, derive_more::Error)]
#[display("Invalid user role id: {id}")]
pub struct InvalidUserRoleId {
    pub id: i32,
}

#[derive(
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    EnumIter,
    Serialize,
    Deserialize,
    ToSchema,
)]
pub enum EditableUserRole {
    Moderator,
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

impl TryFrom<i32> for UserRoleEnum {
    type Error = InvalidUserRoleId;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(UserRoleEnum::Admin),
            2 => Ok(UserRoleEnum::Moderator),
            3 => Ok(UserRoleEnum::User),
            _ => Err(InvalidUserRoleId { id: value }),
        }
    }
}

impl From<EditableUserRole> for UserRoleEnum {
    fn from(value: EditableUserRole) -> Self {
        match value {
            EditableUserRole::Moderator => UserRoleEnum::Moderator,
        }
    }
}

impl EditableUserRole {
    pub fn all_role_ids() -> Vec<i32> {
        Self::iter()
            .map(UserRoleEnum::from)
            .map(i32::from)
            .collect()
    }
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct UserRole {
    pub id: i32,
    #[schema(value_type = UserRoleEnum)]
    pub name: String,
}

impl From<entity::user_role::Model> for UserRole {
    fn from(value: entity::user_role::Model) -> Self {
        UserRoleEnum::try_from(value.role_id)
            .expect("valid user role id from database")
            .into()
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

impl From<UserRole> for UserRoleEnum {
    fn from(val: UserRole) -> Self {
        (&val).into()
    }
}

impl From<&UserRole> for UserRoleEnum {
    fn from(val: &UserRole) -> Self {
        Self::try_from(val.id).expect("valid user role id from domain model")
    }
}
