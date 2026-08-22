pub use auth_core::user_role::{EditableUserRole, UserRoleEnum};
use serde::Serialize;
use utoipa::ToSchema;

use crate::infra::database::error::{BrokenEntityReference, DatabaseError};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct UserRole {
    pub id: i32,
    #[schema(value_type = UserRoleEnum)]
    pub name: String,
}

impl TryFrom<entity::user_role::Model> for UserRole {
    type Error = DatabaseError;

    fn try_from(value: entity::user_role::Model) -> Result<Self, Self::Error> {
        UserRoleEnum::try_from(value.role_id)
            .map(Into::into)
            .map_err(|_| {
                DatabaseError::from(BrokenEntityReference {
                    entity: "user_role",
                    id: value.role_id,
                })
            })
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
