use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

mod http;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().merge(http::router())
}
