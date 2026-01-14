use utoipa_axum::router::OpenApiRouter;

use super::{manage, view};
use crate::adapter::inbound::rest::state::ArcAppState;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(manage::router())
        .merge(view::router())
}
