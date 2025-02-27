use axum::Router;
use axum_login::AuthManagerLayerBuilder;
use axum_login::tower_sessions::cookie::time::Duration;
use axum_login::tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions_redis_store::RedisStore;

use crate::middleware;
use crate::state::{AppState, CONFIG};

pub fn append_global_middleware_layer(
    router: Router<AppState>,
    state: &AppState,
) -> Router<AppState> {
    let session_store = RedisStore::new(state.redis_pool());

    let session_layer = SessionManagerLayer::new(session_store)
        .with_name("session_token")
        .with_expiry(Expiry::OnInactivity(Duration::days(30)));

    let auth_layer =
        AuthManagerLayerBuilder::new(state.user_service.clone(), session_layer)
            .build();

    router.layer(auth_layer).layer({
        let conf = CONFIG.middleware.limit;

        middleware::limit_layer()
            .req_per_sec(conf.req_per_sec)
            .burst_size(conf.burst_size)
            .call()
    })
}
