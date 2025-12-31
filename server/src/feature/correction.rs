use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

mod compare;
mod detail;
mod diff;
mod handle;
mod history;
mod pending;
mod revisions;
mod shared;

pub use handle::HandleCorrectionMethod;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(compare::router())
        .merge(detail::router())
        .merge(diff::router())
        .merge(handle::router())
        .merge(pending::router())
        .merge(history::router())
        .merge(revisions::router())
}
