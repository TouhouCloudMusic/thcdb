mod from;
mod graphql;
mod impl_enums;
mod into_active_model;
mod into_active_value;
use axum_login::AuthUser;
pub use graphql::GqlScalarValue;
use sea_orm::{ActiveValue, IntoActiveValue};

use crate::sea_orm_active_enums::DatePrecision;

impl AuthUser for super::entities::user::Model {
    type Id = i32;

    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes()
    }
}

impl IntoActiveValue<DatePrecision> for Option<DatePrecision> {
    fn into_active_value(self) -> ActiveValue<DatePrecision> {
        match self {
            Some(v) => ActiveValue::set(v),
            None => ActiveValue::NotSet,
        }
    }
}
