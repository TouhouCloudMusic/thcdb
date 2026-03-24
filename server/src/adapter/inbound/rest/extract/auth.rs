use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::{StatusCode, header};
use axum::response::IntoResponse;
use axum_extra::typed_header::TypedHeader;
use headers::Authorization;
use headers::authorization::Basic;

use crate::adapter::inbound::rest::{AuthRejection, state};
use crate::domain::auth::AuthCredential;
use crate::domain::user::User;

#[derive(Clone)]
pub struct CurrentUser(pub User);

fn ensure_email_verified(user: User) -> Result<User, axum::response::Response> {
    if user.email_verified {
        Ok(user)
    } else {
        Err(StatusCode::UNAUTHORIZED.into_response())
    }
}

fn cache_current_user(
    parts: &mut Parts,
    user: User,
) -> Result<CurrentUser, axum::response::Response> {
    let user = ensure_email_verified(user)?;
    let user = CurrentUser(user);
    parts.extensions.insert(user.clone());
    Ok(user)
}

fn auth_session(
    parts: &Parts,
) -> Result<state::AuthSession, axum::response::Response> {
    parts
        .extensions
        .get::<state::AuthSession>()
        .cloned()
        .ok_or_else(|| {
            log::error!(
                target: "adapter.rest.extract.auth",
                extension = "AuthSession";
                "auth session not found in request extensions"
            );
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        })
}

async fn resolve_basic_auth_user(
    parts: &mut Parts,
    session: state::AuthSession,
) -> Result<Option<CurrentUser>, axum::response::Response> {
    if !parts.headers.contains_key(header::AUTHORIZATION) {
        return Ok(None);
    }

    let TypedHeader(Authorization(basic)) =
        TypedHeader::<Authorization<Basic>>::from_request_parts(parts, &())
            .await
            .map_err(IntoResponse::into_response)?;

    let creds =
        AuthCredential::from_sign_in(basic.username(), basic.password());

    match session.authenticate(creds).await {
        Ok(Some(user)) => cache_current_user(parts, user).map(Some),
        Ok(None) => Err(StatusCode::UNAUTHORIZED.into_response()),
        Err(err) => {
            let is_auth_rejection = match &err {
                axum_login::Error::Session(_) => false,
                axum_login::Error::Backend(err) => err.is_auth_rejection(),
            };

            if is_auth_rejection {
                Err(StatusCode::UNAUTHORIZED.into_response())
            } else {
                log::error!(
                    target: "adapter.rest.extract.auth",
                    error:? = err;
                    "basic authentication failed"
                );
                Err(StatusCode::INTERNAL_SERVER_ERROR.into_response())
            }
        }
    }
}

pub(crate) async fn preload_current_user(parts: &mut Parts) {
    if parts.extensions.get::<CurrentUser>().is_some() {
        return;
    }

    if parts
        .extensions
        .get::<state::AuthSession>()
        .and_then(|session| session.user.as_ref())
        .is_some()
    {
        return;
    }

    let Some(session) = parts.extensions.get::<state::AuthSession>().cloned()
    else {
        return;
    };

    let _ = resolve_basic_auth_user(parts, session).await;
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

        let session = auth_session(parts)?;

        if let Some(user) = session.user {
            let user = cache_current_user(parts, user)?;
            return Ok(user);
        }

        resolve_basic_auth_user(parts, session)
            .await?
            .ok_or_else(|| StatusCode::UNAUTHORIZED.into_response())
    }
}
