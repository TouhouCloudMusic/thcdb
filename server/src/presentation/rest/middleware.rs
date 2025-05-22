use std::convert::Infallible;
use std::env;
use std::sync::Arc;

use axum::extract::{FromRef, Request};
use axum::response::IntoResponse;
use axum::routing::Route;
use axum::{Router, http};
use axum_login::AuthManagerLayerBuilder;
use axum_login::tower_sessions::cookie::time::Duration;
use axum_login::tower_sessions::{Expiry, SessionManagerLayer};
use governor::clock::QuantaInstant;
use tower::{Layer, Service};
use tower_governor::GovernorLayer;
use tower_governor::key_extractor::PeerIpKeyExtractor;
use tower_http::cors::{Any, CorsLayer};
use tower_sessions_redis_store::RedisStore;

use super::state::{
    ArcAppState, {self},
};
use crate::infra::singleton::APP_CONFIG;

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
        .layer(limit_layer)
        .layer(cors_layer())
}

fn auth_layer(state: &ArcAppState) -> impl AxumLayerBounds {
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

#[bon::builder]
pub fn limit_layer(
    req_per_sec: u64,
    burst_size: u32,
) -> GovernorLayer<
    PeerIpKeyExtractor,
    governor::middleware::NoOpMiddleware<QuantaInstant>,
> {
    use std::time::Duration;

    use tower_governor::governor::GovernorConfigBuilder;

    let config = GovernorConfigBuilder::default()
        .per_second(req_per_sec)
        .burst_size(burst_size)
        .finish()
        .unwrap();

    let governor_conf: Arc<
        tower_governor::governor::GovernorConfig<
            PeerIpKeyExtractor,
            governor::middleware::NoOpMiddleware<QuantaInstant>,
        >,
    > = Arc::new(config);

    let governor_limiter = governor_conf.limiter().clone();

    let interval = Duration::from_secs(60);

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(interval);
            // tracing::info!(
            //     "rate limiting storage size: {}",
            //     governor_limiter.len()
            // );
            governor_limiter.retain_recent();
        }
    });

    GovernorLayer {
        config: governor_conf,
    }
}
