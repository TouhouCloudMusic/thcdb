use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

mod error;
mod http;
mod model;
mod repo;
mod service;

#[cfg(all(test, feature = "integration-test"))]
mod tests;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().merge(http::router())
}
