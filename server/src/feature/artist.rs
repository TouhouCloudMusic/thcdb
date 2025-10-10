use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

pub mod find;
mod release;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(find::router())
        .merge(release::router())
}
