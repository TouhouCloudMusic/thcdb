use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

use super::{compare, detail, diff, handle, history, pending, revisions};

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
