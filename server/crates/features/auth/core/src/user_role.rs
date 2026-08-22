use entity::role;
use infra_db::lookup_table::ValidateLookupTable;
use sea_orm::ActiveValue::Set;
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
use strum::{EnumCount, EnumIter, EnumString, IntoEnumIterator};
use utoipa::ToSchema;

#[derive(
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
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

impl UserRoleEnum {
    pub const fn is_editable(self) -> bool {
        matches!(self, Self::Moderator)
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

impl PartialEq<role::Model> for UserRoleEnum {
    fn eq(&self, other: &role::Model) -> bool {
        i32::from(*self) == other.id && self.to_string() == other.name
    }
}

impl From<UserRoleEnum> for role::ActiveModel {
    fn from(val: UserRoleEnum) -> Self {
        Self {
            id: Set(val.into()),
            name: Set(val.to_string()),
        }
    }
}

pub struct UserRoleConflict {
    id: i32,
    db_name: String,
    enum_name: String,
}

impl ValidateLookupTable for UserRoleEnum {
    type ConflictData = UserRoleConflict;
    type Entity = role::Entity;

    fn try_from_model(
        model: &<Self::Entity as EntityTrait>::Model,
    ) -> Result<Self, ()> {
        Self::try_from(model.id).map_err(|_| ())
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
        UserRoleConflict {
            id,
            db_name,
            enum_name,
        }: UserRoleConflict,
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
