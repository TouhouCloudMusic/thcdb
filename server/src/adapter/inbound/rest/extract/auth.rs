use std::sync::OnceLock;
use std::time::Duration;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::{StatusCode, header};
use axum::response::IntoResponse;
use axum_extra::typed_header::TypedHeader;
use headers::Authorization;
use headers::authorization::Basic;
use moka::future::Cache;
use rapidhash::fast::SeedableState as RapidState;

use crate::adapter::inbound::rest::state;
use crate::domain::auth::{AuthCredential, AuthnError};
use crate::domain::user::User;
use crate::features::auth::{AuthnBackendError, SignInError};

#[derive(Clone)]
pub struct CurrentUser(pub User);

const BASIC_AUTH_TTL: Duration = Duration::from_mins(30);
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

fn ensure_email_verified(user: User) -> Result<User, axum::response::Response> {
    if user.email_verified {
        Ok(user)
    } else {
        Err(StatusCode::UNAUTHORIZED.into_response())
    }
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
        if let Some(user) = parts.extensions.get::<Self>().cloned() {
            if !user.0.email_verified {
                return Err(StatusCode::UNAUTHORIZED.into_response());
            }
            return Ok(user);
        }

        let session = parts
            .extensions
            .get::<state::AuthSession>()
            .cloned()
            .ok_or_else(|| {
                tracing::error!("The AuthSession was not found");
                StatusCode::INTERNAL_SERVER_ERROR.into_response()
            })?;

        if let Some(user) = session.user {
            let user = ensure_email_verified(user)?;
            let user = Self(user);
            parts.extensions.insert(user.clone());
            return Ok(user);
        }

        if !parts.headers.contains_key(header::AUTHORIZATION) {
            return Err(StatusCode::UNAUTHORIZED.into_response());
        }

        let TypedHeader(Authorization(basic)) =
            TypedHeader::<Authorization<Basic>>::from_request_parts(parts, &())
                .await
                .map_err(IntoResponse::into_response)?;

        let key = fmt_key(basic.username(), basic.password());

        if let Some(user) = BASIC_AUTH_CACHE.lookup(&key).await {
            let user = match ensure_email_verified(user) {
                Ok(user) => user,
                Err(rejection) => {
                    BASIC_AUTH_CACHE.remove(&key).await;
                    return Err(rejection);
                }
            };
            let user = Self(user);
            parts.extensions.insert(user.clone());
            return Ok(user);
        }

        let creds =
            match AuthCredential::try_new(basic.username(), basic.password()) {
                Ok(creds) => creds,
                Err(e) => Err(e.into_response())?,
            };

        match session.authenticate(creds).await {
            Ok(Some(user)) => {
                let user = ensure_email_verified(user)?;
                BASIC_AUTH_CACHE.store(key, &user).await;
                let user = Self(user);
                parts.extensions.insert(user.clone());
                Ok(user)
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
                                | SignInError::EmailNotVerified
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
