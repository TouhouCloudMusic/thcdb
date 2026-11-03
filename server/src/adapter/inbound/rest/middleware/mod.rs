use std::convert::Infallible;
use std::time::Instant;

use axum::extract::{FromRef, MatchedPath, Request};
use axum::middleware::{Next, from_fn};
use axum::response::{IntoResponse, Response};
use axum::routing::Route;
use axum::{Router, http};
use axum_login::tower_sessions::cookie::time::Duration;
use axum_login::tower_sessions::{Expiry, SessionManagerLayer};
use axum_login::{AuthManagerLayer, AuthManagerLayerBuilder};
use fastrace::collector::SpanContext;
use fastrace::local::LocalSpan;
use fastrace_axum::FastraceLayer;
use infra_observability::span;
use tower::{Layer, Service, ServiceBuilder};
use tower_http::cors::{Any, CorsLayer};
use tower_sessions_redis_store::RedisStore;

use super::state::{self, ArcAppState};
use crate::features;

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
    let conf = state.middleware.limit;

    let limit_layer = limit_layer()
        .req_per_sec(conf.req_per_sec)
        .burst_size(conf.burst_size)
        .maybe_bypass_token(state.import_bypass_token.clone())
        .call();

    router.layer(
        ServiceBuilder::new()
            .layer(FastraceLayer::default())
            .layer(from_fn(observe_http))
            .layer(cors_layer())
            .layer(auth_layer(state))
            .layer(limit_layer),
    )
}

const TRACE_ID_HEADER: http::HeaderName =
    http::HeaderName::from_static("x-trace-id");

static METRIC_HTTP_METHODS: [http::Method; 9] = [
    http::Method::GET,
    http::Method::POST,
    http::Method::PUT,
    http::Method::PATCH,
    http::Method::DELETE,
    http::Method::HEAD,
    http::Method::OPTIONS,
    http::Method::CONNECT,
    http::Method::TRACE,
];

async fn observe_http(request: Request, next: Next) -> Response {
    let started = Instant::now();
    let method = METRIC_HTTP_METHODS
        .iter()
        .find(|method| *method == request.method())
        .map_or("_OTHER", http::Method::as_str);
    let route = request
        .extensions()
        .get::<MatchedPath>()
        .map_or("<unmatched>", MatchedPath::as_str)
        .to_owned();
    let context = SpanContext::current_local_parent();
    LocalSpan::add_property(|| ("span.kind", "server"));
    if request
        .headers()
        .get(fastrace_axum::TRACEPARENT_HEADER)
        .and_then(|value| value.to_str().ok())
        .and_then(SpanContext::decode_w3c_traceparent)
        .is_some()
    {
        LocalSpan::add_property(|| ("span.parent_span_is_remote", "true"));
    }

    let mut response = next.run(request).await;
    if let Some(context) = context {
        let trace_id = http::HeaderValue::from_str(&format!(
            "{:032x}",
            context.trace_id.0
        ))
        .expect("A hexadecimal trace ID is a valid header value");
        response.headers_mut().insert(TRACE_ID_HEADER, trace_id);
    }
    if response.status().is_server_error() {
        span::record_error(Some(response.status().as_str().to_owned().into()));
    }
    infra_observability::http::observe_http(
        method,
        route,
        response.status().as_u16(),
        started.elapsed(),
    );
    response
}

pub(super) fn auth_layer(
    state: &ArcAppState,
) -> AuthManagerLayer<features::auth::Service, RedisStore<fred::clients::Pool>>
{
    let pool = state.redis_pool();
    let session_store = RedisStore::new(pool);

    let session_layer = SessionManagerLayer::new(session_store)
        .with_name("session_token")
        .with_expiry(Expiry::OnInactivity(Duration::days(30)))
        .with_secure(state.middleware.session_secure);

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

    let methods = [Method::GET, Method::POST, Method::PUT, Method::DELETE];

    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods(methods)
        .allow_headers(Any)
        .expose_headers([TRACE_ID_HEADER])
}
