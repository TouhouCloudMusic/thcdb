use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

mod error;
mod http;
mod model;
mod repo;
mod service;

pub(crate) use http::EntityUserCollectionTarget;
pub(crate) use model::EntityUserCollectionSort;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().merge(http::router())
}
