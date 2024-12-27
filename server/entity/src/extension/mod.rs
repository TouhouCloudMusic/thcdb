mod from;
mod graphql;
mod impl_enums;
mod into_active_model;
mod into_active_value;
mod model_conversion;
use axum_login::AuthUser;
pub use graphql::GqlScalarValue;

impl AuthUser for super::entities::user::Model {
    type Id = i32;

    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes()
    }
}
