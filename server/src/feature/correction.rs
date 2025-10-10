use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

mod pending;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().merge(pending::router())
}
