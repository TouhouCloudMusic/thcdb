use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

mod http;
mod model;
pub(crate) mod repo;

pub use model::{EmailVerification, NewUser, User};

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().merge(http::router())
}
