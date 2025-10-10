use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

pub mod find;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().merge(find::router())
}
