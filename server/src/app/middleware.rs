use std::env;

use axum::{Router, http};
use axum_login::AuthManagerLayerBuilder;
use axum_login::tower_sessions::cookie::time::Duration;
use axum_login::tower_sessions::{Expiry, SessionManagerLayer};
use tower_http::cors::{Any, CorsLayer};
use tower_sessions_redis_store::RedisStore;

use crate::state::{ArcAppState, CONFIG};
use crate::{middleware, state};

pub fn append_global_middleware_layer(
    router: Router<ArcAppState>,
    state: &ArcAppState,
) -> Router<ArcAppState> {
    let session_store = RedisStore::new(state.redis_pool());

    let session_layer = SessionManagerLayer::new(session_store)
        .with_name("session_token")
        .with_expiry(Expiry::OnInactivity(Duration::days(30)))
        .with_secure(
            env::var("SESSION_SECURE")
                .as_deref()
                .unwrap_or("true")
                .eq_ignore_ascii_case("true"),
        );

    let auth_layer = AuthManagerLayerBuilder::new(
        // TODO: From Ref for state
        state::AuthService::new(state.sea_orm_repo.clone()),
        session_layer,
    )
    .build();

    let conf = CONFIG.middleware.limit;

    let limit_layer = middleware::limit_layer()
        .req_per_sec(conf.req_per_sec)
        .burst_size(conf.burst_size)
        .call();

    router
        .layer(auth_layer)
        .layer(limit_layer)
        .layer(cors_layer())
}

fn cors_layer() -> CorsLayer {
    use http::Method;

    let origins = [
        // TODO: config file
        "http://127.0.0.1:3000".parse().unwrap(),
        "http://localhost:3000".parse().unwrap(),
    ];

    let methods = [Method::GET, Method::POST];

    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods(methods)
        .allow_headers(Any)
}
