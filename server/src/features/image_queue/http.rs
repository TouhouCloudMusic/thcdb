use utoipa_axum::router::OpenApiRouter;

use super::{manage, subscription, view};
use crate::adapter::inbound::rest::state::ArcAppState;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(manage::router())
        .merge(subscription::router())
        .merge(view::router())
}
