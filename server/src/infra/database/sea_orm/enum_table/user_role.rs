use entity::role;
use sea_orm::ActiveValue::Set;
use sea_orm::EntityTrait;

use super::{EnumTableValue, LookupTableCheckResult, ValidateLookupTable};
use crate::domain::model::UserRoleEnum;

impl<T> From<T> for LookupTableCheckResult<T> {
    fn from(val: T) -> Self {
        Self::Conflict(val)
    }
}

impl PartialEq<role::Model> for UserRoleEnum {
    fn eq(&self, other: &role::Model) -> bool {
        self.as_id() == other.id && self.to_string() == other.name
    }
}

pub(super) struct UserRoleConflict {
    pub id: i32,
    pub db_name: String,
    pub enum_name: String,
}

impl From<UserRoleEnum> for role::ActiveModel {
    fn from(val: UserRoleEnum) -> Self {
        Self {
            id: Set(val.as_id()),
            name: Set(val.to_string()),
        }
    }
}

impl From<&role::Model> for UserRoleEnum {
    fn from(val: &role::Model) -> Self {
        Self::try_from(val.id).expect("Invalid user role id from database")
    }
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

impl EnumTableValue for UserRoleEnum {
    fn as_id(&self) -> i32 {
        match self {
            Self::Admin => 1,
            Self::Moderator => 2,
            Self::User => 3,
        }
    }
}
