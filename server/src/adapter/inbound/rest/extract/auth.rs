use std::sync::OnceLock;
use std::time::Duration;

use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;
use axum::response::IntoResponse;
use axum_extra::typed_header::TypedHeader;
use headers::Authorization;
use headers::authorization::Basic;
use moka::future::Cache;
use rapidhash::fast::SeedableState as RapidState;

use crate::adapter::inbound::rest::state;
use crate::application::auth::{AuthnBackendError, SignInError};
use crate::domain::auth::{AuthCredential, AuthnError};
use crate::domain::user::User;

pub struct CurrentUser(pub User);

const BASIC_AUTH_TTL: Duration = Duration::from_secs(30 * 60);
const BASIC_AUTH_CAPACITY: u64 = 100;

struct BasicAuthCache(OnceLock<Cache<String, User, RapidState<'static>>>);

impl BasicAuthCache {
    const fn new() -> Self {
        Self(OnceLock::new())
    }

    fn cache(&self) -> &Cache<String, User, RapidState<'static>> {
        self.0.get_or_init(|| {
            Cache::builder()
                .time_to_live(BASIC_AUTH_TTL)
                .max_capacity(BASIC_AUTH_CAPACITY)
                .build_with_hasher(RapidState::fixed())
        })
    }

    async fn lookup(&self, key: &str) -> Option<User> {
        self.cache().get(key).await
    }

    async fn store(&self, key: String, user: &User) {
        self.cache().insert(key, user.clone()).await;
    }

    async fn remove(&self, key: &str) {
        let _ = self.cache().remove(key).await;
    }
}

static BASIC_AUTH_CACHE: BasicAuthCache = BasicAuthCache::new();

fn fmt_key(username: &str, password: &str) -> String {
    format!("{username}{password}")
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = axum::response::Response;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let session = parts
            .extensions
            .get::<state::AuthSession>()
            .cloned()
            .ok_or_else(|| {
                tracing::error!("The AuthSession was not found");
                StatusCode::INTERNAL_SERVER_ERROR.into_response()
            })?;

        if let Some(user) = session.user {
            return Ok(Self(user));
        }

        let TypedHeader(Authorization(basic)) =
            TypedHeader::<Authorization<Basic>>::from_request_parts(parts, &())
                .await
                .map_err(IntoResponse::into_response)?;

        let key = fmt_key(basic.username(), basic.password());

        if let Some(user) = BASIC_AUTH_CACHE.lookup(&key).await {
            return Ok(Self(user));
        }

        let creds =
            match AuthCredential::try_new(basic.username(), basic.password()) {
                Ok(creds) => creds,
                Err(e) => Err(e.into_response())?,
            };

        match session.authenticate(creds).await {
            Ok(Some(user)) => {
                BASIC_AUTH_CACHE.store(key, &user).await;
                Ok(Self(user))
            }
            Ok(None) => Err(StatusCode::UNAUTHORIZED.into_response()),
            Err(err) => {
                let is_auth_error = match &err {
                    axum_login::Error::Session(_) => false,
                    axum_login::Error::Backend(err) => match err {
                        AuthnBackendError::Authn { source } => {
                            matches!(
                                source,
                                AuthnError::AuthenticationFailed { .. }
                            )
                        }
                        AuthnBackendError::SignIn { source } => matches!(
                            source,
                            SignInError::Authn {
                                source: AuthnError::AuthenticationFailed { .. }
                            } | SignInError::Validate { .. }
                        ),
                        AuthnBackendError::Internal { .. } => false,
                    },
                };
                if is_auth_error {
                    Err(StatusCode::UNAUTHORIZED.into_response())
                } else {
                    tracing::error!(?err, "Basic authentication failed");
                    Err(StatusCode::INTERNAL_SERVER_ERROR.into_response())
                }
            }
        }
    }
}
