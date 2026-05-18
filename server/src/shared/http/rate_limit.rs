use std::sync::Arc;
use std::task::{Context, Poll};

use axum::body::Body;
use axum::http::{HeaderMap, Request};
use futures_util::future::Either;
use governor::clock::QuantaInstant;
use governor::middleware::NoOpMiddleware;
use tower::{Layer, Service};
use tower_governor::GovernorLayer;
use tower_governor::key_extractor::PeerIpKeyExtractor;

const IMPORT_TOKEN_HEADER: &str = "x-import-token";

type GovernorRateLimitLayer =
    GovernorLayer<PeerIpKeyExtractor, NoOpMiddleware<QuantaInstant>, Body>;

#[derive(Debug, Clone)]
struct BypassToken {
    value: Option<Arc<str>>,
}

impl BypassToken {
    fn new(token: Option<String>) -> Self {
        Self {
            value: token.map(|token| {
                assert!(
                    !token.is_empty(),
                    "IMPORT_BYPASS_TOKEN must not be empty"
                );

                Arc::from(token.into_boxed_str())
            }),
        }
    }

    fn matches(&self, headers: &HeaderMap) -> bool {
        self.value.as_deref().is_some_and(|token| {
            headers
                .get(IMPORT_TOKEN_HEADER)
                .and_then(|value| value.to_str().ok())
                .is_some_and(|value| value.as_bytes() == token.as_bytes())
        })
    }
}

#[derive(Clone)]
pub(crate) struct RateLimitLayer {
    bypass_token: BypassToken,
    governor: GovernorRateLimitLayer,
}

impl RateLimitLayer {
    pub(crate) fn new(
        bypass_token: Option<String>,
        governor: GovernorRateLimitLayer,
    ) -> Self {
        Self {
            bypass_token: BypassToken::new(bypass_token),
            governor,
        }
    }
}

impl<S> Layer<S> for RateLimitLayer
where
    S: Clone,
    GovernorRateLimitLayer: Layer<S>,
{
    type Service = RateLimitedService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        Self::Service {
            bypass_token: self.bypass_token.clone(),
            bypassed: inner.clone(),
            limited: self.governor.layer(inner),
        }
    }
}

pub(crate) struct RateLimitedService<S>
where
    GovernorRateLimitLayer: Layer<S>,
{
    bypass_token: BypassToken,
    bypassed: S,
    limited: <GovernorRateLimitLayer as Layer<S>>::Service,
}

impl<S> Clone for RateLimitedService<S>
where
    S: Clone,
    GovernorRateLimitLayer: Layer<S>,
    <GovernorRateLimitLayer as Layer<S>>::Service: Clone,
{
    fn clone(&self) -> Self {
        Self {
            bypass_token: self.bypass_token.clone(),
            bypassed: self.bypassed.clone(),
            limited: self.limited.clone(),
        }
    }
}

impl<S, ReqBody> Service<Request<ReqBody>> for RateLimitedService<S>
where
    S: Service<Request<ReqBody>>,
    GovernorRateLimitLayer: Layer<S>,
    <GovernorRateLimitLayer as Layer<S>>::Service:
        Service<Request<ReqBody>, Response = S::Response, Error = S::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Either<
        S::Future,
        <<GovernorRateLimitLayer as Layer<S>>::Service as Service<
            Request<ReqBody>,
        >>::Future,
    >;

    fn poll_ready(
        &mut self,
        cx: &mut Context<'_>,
    ) -> Poll<Result<(), Self::Error>> {
        match self.bypassed.poll_ready(cx) {
            Poll::Ready(Ok(())) => self.limited.poll_ready(cx),
            Poll::Ready(Err(err)) => Poll::Ready(Err(err)),
            Poll::Pending => Poll::Pending,
        }
    }

    fn call(&mut self, req: Request<ReqBody>) -> Self::Future {
        if self.bypass_token.matches(req.headers()) {
            Either::Left(self.bypassed.call(req))
        } else {
            Either::Right(self.limited.call(req))
        }
    }
}
