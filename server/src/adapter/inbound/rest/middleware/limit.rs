use std::cmp::max;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use axum::body::Body;
use axum::http;
use governor::clock::QuantaInstant;
use governor::middleware::NoOpMiddleware;
use tower_governor::key_extractor::{KeyExtractor, PeerIpKeyExtractor};
use tower_governor::{GovernorError, GovernorLayer};

use crate::adapter::inbound::rest::{CurrentUser, state};
use crate::domain::model::UserRoleEnum;

#[bon::builder]
pub(crate) fn pre_auth_limit_layer(
    req_per_sec: u64,
    burst_size: u32,
) -> GovernorLayer<
    PreAuthRateLimitKeyExtractor,
    NoOpMiddleware<QuantaInstant>,
    Body,
> {
    use std::time::Duration;

    use tower_governor::governor::GovernorConfigBuilder;

    let config = GovernorConfigBuilder::default()
        .per_nanosecond(max(1_000_000_000 / req_per_sec, 1))
        .burst_size(burst_size)
        .key_extractor(PreAuthRateLimitKeyExtractor)
        .finish()
        .unwrap();

    let governor_conf = Arc::new(config);

    let governor_limiter = governor_conf.limiter().clone();

    let interval = Duration::from_mins(1);

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(interval);
            governor_limiter.retain_recent();
        }
    });

    GovernorLayer::new(governor_conf)
}

#[bon::builder]
pub(crate) fn limit_layer(
    req_per_sec: u64,
    burst_size: u32,
) -> GovernorLayer<RateLimitKeyExtractor, NoOpMiddleware<QuantaInstant>, Body> {
    use std::time::Duration;

    use tower_governor::governor::GovernorConfigBuilder;

    let config = GovernorConfigBuilder::default()
        .per_nanosecond(max(1_000_000_000 / req_per_sec, 1))
        .burst_size(burst_size)
        .key_extractor(RateLimitKeyExtractor)
        .finish()
        .unwrap();

    let governor_conf = Arc::new(config);

    let governor_limiter = governor_conf.limiter().clone();

    let interval = Duration::from_mins(1);

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(interval);
            governor_limiter.retain_recent();
        }
    });

    GovernorLayer::new(governor_conf)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub(crate) enum RateLimitKey {
    Client(IpAddr),
    Bypass(u64),
}

impl RateLimitKey {
    fn bypass() -> Self {
        static BYPASS_REQUEST_ID: AtomicU64 = AtomicU64::new(0);

        Self::Bypass(BYPASS_REQUEST_ID.fetch_add(1, Ordering::Relaxed))
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) struct RateLimitKeyExtractor;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) struct PreAuthRateLimitKeyExtractor;

impl KeyExtractor for PreAuthRateLimitKeyExtractor {
    type Key = RateLimitKey;

    fn extract<T>(
        &self,
        req: &http::Request<T>,
    ) -> Result<Self::Key, GovernorError> {
        if is_loopback_request(req) {
            return Ok(RateLimitKey::bypass());
        }

        PeerIpKeyExtractor.extract(req).map(RateLimitKey::Client)
    }
}

impl KeyExtractor for RateLimitKeyExtractor {
    type Key = RateLimitKey;

    fn extract<T>(
        &self,
        req: &http::Request<T>,
    ) -> Result<Self::Key, GovernorError> {
        if should_bypass_limit(req) {
            return Ok(RateLimitKey::bypass());
        }

        PeerIpKeyExtractor.extract(req).map(RateLimitKey::Client)
    }
}

fn peer_ip<T>(req: &http::Request<T>) -> Option<IpAddr> {
    req.extensions()
        .get::<axum::extract::ConnectInfo<SocketAddr>>()
        .map(|addr| addr.ip())
}

fn is_loopback_request<T>(req: &http::Request<T>) -> bool {
    peer_ip(req).is_some_and(|ip| ip.is_loopback())
}

fn has_admin_user<T>(req: &http::Request<T>) -> bool {
    req.extensions()
        .get::<CurrentUser>()
        .map(|CurrentUser(user)| user)
        .or_else(|| {
            req.extensions()
                .get::<state::AuthSession>()
                .and_then(|session| session.user.as_ref())
        })
        .is_some_and(|user| user.has_roles(&[UserRoleEnum::Admin]))
}

fn should_bypass_limit<T>(req: &http::Request<T>) -> bool {
    is_loopback_request(req) || has_admin_user(req)
}

#[cfg(test)]
mod tests {
    use axum::http::Request;
    use chrono::{FixedOffset, TimeZone};
    use serde_json::Value;

    use super::*;
    use crate::domain::model::UserRole;
    use crate::domain::user::User;

    fn request(
        path: &str,
        addr: Option<SocketAddr>,
        current_user: Option<CurrentUser>,
    ) -> Request<()> {
        let mut req = Request::builder().uri(path).body(()).unwrap();

        if let Some(addr) = addr {
            req.extensions_mut()
                .insert(axum::extract::ConnectInfo(addr));
        }

        if let Some(current_user) = current_user {
            req.extensions_mut().insert(current_user);
        }

        req
    }

    fn current_user(role: UserRoleEnum) -> CurrentUser {
        let now = FixedOffset::east_opt(0)
            .unwrap()
            .with_ymd_and_hms(2025, 1, 1, 0, 0, 0)
            .single()
            .unwrap();

        CurrentUser(User {
            id: 1,
            name: "admin".to_string(),
            email: "admin@example.com".to_string(),
            email_verified: true,
            password: "password".to_string(),
            email_verification: None,
            avatar_id: None,
            profile_banner_id: None,
            last_login: now,
            created_at: now,
            roles: vec![UserRole::from(role)],
            bio: None,
            settings: Value::Null,
        })
    }

    #[test]
    fn bypasses_loopback_requests() {
        let req = request(
            "/api/health",
            Some(SocketAddr::from(([127, 0, 0, 1], 12345))),
            None,
        );

        assert!(should_bypass_limit(&req));
    }

    #[test]
    fn bypasses_admin_users() {
        let req = request(
            "/api/health",
            Some(SocketAddr::from(([192, 168, 1, 10], 12345))),
            Some(current_user(UserRoleEnum::Admin)),
        );

        assert!(should_bypass_limit(&req));
    }

    #[test]
    fn keeps_rate_limit_for_non_admin_non_loopback_requests() {
        let req = request(
            "/api/health",
            Some(SocketAddr::from(([192, 168, 1, 10], 12345))),
            Some(current_user(UserRoleEnum::User)),
        );

        assert!(!should_bypass_limit(&req));
    }

    #[test]
    fn pre_auth_limiter_only_bypasses_loopback_requests() {
        let loopback_req = request(
            "/api/health",
            Some(SocketAddr::from(([127, 0, 0, 1], 12345))),
            Some(current_user(UserRoleEnum::Admin)),
        );
        let remote_admin_req = request(
            "/api/health",
            Some(SocketAddr::from(([192, 168, 1, 10], 12345))),
            Some(current_user(UserRoleEnum::Admin)),
        );

        assert!(matches!(
            PreAuthRateLimitKeyExtractor.extract(&loopback_req),
            Ok(RateLimitKey::Bypass(_))
        ));
        assert_eq!(
            PreAuthRateLimitKeyExtractor
                .extract(&remote_admin_req)
                .unwrap(),
            RateLimitKey::Client(IpAddr::from([192, 168, 1, 10]))
        );
    }
}
