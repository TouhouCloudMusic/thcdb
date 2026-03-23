use std::convert::Infallible;

use axum::extract::{FromRef, Request};
use axum::middleware::{Next, from_fn};
use axum::response::IntoResponse;
use axum::routing::Route;
use axum::{Router, http};
use axum_login::AuthManagerLayerBuilder;
use axum_login::tower_sessions::cookie::time::Duration;
use axum_login::tower_sessions::{Expiry, SessionManagerLayer};
use fastrace_axum::FastraceLayer;
use tower::{Layer, Service};
use tower_http::cors::{Any, CorsLayer};
use tower_sessions_redis_store::RedisStore;

use super::extract;
use super::state::{self, ArcAppState};
use crate::infra::singleton::APP_CONFIG;

mod limit;

pub(crate) use limit::limit_layer;

pub trait AxumLayerBounds = where
    Self: Layer<Route> + Clone + Send + Sync + 'static + Sized,
    Self::Service: Service<Request> + Clone + Send + Sync + 'static,
    <Self::Service as Service<Request>>::Response: IntoResponse + 'static,
    <Self::Service as Service<Request>>::Error: Into<Infallible> + 'static,
    <Self::Service as Service<Request>>::Future: Send + 'static;

pub fn append_global_middlewares<S>(
    router: Router<S>,
    state: &ArcAppState,
) -> Router<S>
where
    S: Send + Sync + Clone + 'static,
{
    let conf = APP_CONFIG.middleware.limit;

    let limit_layer = limit_layer()
        .req_per_sec(conf.req_per_sec)
        .burst_size(conf.burst_size)
        .call();

    router
        .layer(auth_layer(state))
        .layer(from_fn(preload_current_user))
        .layer(limit_layer)
        .layer(cors_layer())
        .layer(FastraceLayer::default())
}

fn auth_layer(state: &ArcAppState) -> impl AxumLayerBounds {
    let pool = state.redis_pool();
    let session_store = RedisStore::new(pool);

    let session_layer = SessionManagerLayer::new(session_store)
        .with_name("session_token")
        .with_expiry(Expiry::OnInactivity(Duration::days(30)))
        .with_secure(APP_CONFIG.middleware.session_secure);

    AuthManagerLayerBuilder::new(
        state::AuthService::from_ref(state),
        session_layer,
    )
    .build()
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

async fn preload_current_user(
    req: Request,
    next: Next,
) -> axum::response::Response {
    let (mut parts, body) = req.into_parts();
    extract::preload_current_user(&mut parts).await;
    next.run(Request::from_parts(parts, body)).await
}
