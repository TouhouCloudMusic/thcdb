use utoipa_axum::router::OpenApiRouter;

use super::{session, sign_up};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, middleware};

pub fn router() -> OpenApiRouter<ArcAppState> {
    let auth_limit_layer = middleware::limit_layer()
        .req_per_sec(1)
        .burst_size(3)
        .call();

    let auth_public_router = OpenApiRouter::new()
        .merge(session::public_router())
        .merge(sign_up::router())
        .layer(auth_limit_layer);

    AppRouter::new()
        .with_public(|r| r.merge(auth_public_router))
        .with_private(|r| r.merge(session::private_router()))
        .finish()
}
