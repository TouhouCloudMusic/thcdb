use utoipa_axum::router::OpenApiRouter;

use super::{
    compare, detail, diff, history, moderation, pending, revisions,
    subscription,
};
use crate::adapter::inbound::rest::state::ArcAppState;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(compare::router())
        .merge(detail::router())
        .merge(diff::router())
        .merge(moderation::router())
        .merge(pending::router())
        .merge(history::router())
        .merge(revisions::router())
        .merge(subscription::router())
}
