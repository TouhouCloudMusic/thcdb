use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

pub mod profile;
mod http;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().merge(profile::router()).merge(http::router())
}
