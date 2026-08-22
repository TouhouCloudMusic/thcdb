use axum::extract::FromRequestParts;
use axum::http::header;
use axum::http::request::Parts;
use axum_extra::typed_header::TypedHeader;
use domain::shared::MessageError;
use headers::Authorization;
use headers::authorization::Basic;

use crate::adapter::inbound::rest::{AuthRejection, state};
use crate::features::auth::AuthCredential;
use crate::features::user::User;
use crate::shared::http::api_response::AppError;

#[derive(Clone)]
pub struct CurrentUser(pub User);

fn ensure_email_verified(user: User) -> Result<User, AppError> {
    if user.email_verified {
        Ok(user)
    } else {
        Err(AppError::unauthorized("Unauthorized"))
    }
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        if let Some(user) = parts.extensions.get::<Self>().cloned() {
            if !user.0.email_verified {
                return Err(AppError::unauthorized("Unauthorized"));
            }
            return Ok(user);
        }

        let session = parts
            .extensions
            .get::<state::AuthSession>()
            .cloned()
            .ok_or_else(|| {
                log::error!(
                    target: "adapter.rest.extract.auth",
                    extension = "AuthSession";
                    "auth session not found in request extensions"
                );
                AppError::internal(MessageError::new("auth session not found"))
            })?;

        if let Some(user) = session.user {
            let user = ensure_email_verified(user)?;
            let user = Self(user);
            parts.extensions.insert(user.clone());
            return Ok(user);
        }

        if !parts.headers.contains_key(header::AUTHORIZATION) {
            return Err(AppError::unauthorized("Unauthorized"));
        }

        let TypedHeader(Authorization(basic)) =
            TypedHeader::<Authorization<Basic>>::from_request_parts(parts, &())
                .await
                .map_err(|_| AppError::unauthorized("Unauthorized"))?;

        let creds =
            AuthCredential::from_sign_in(basic.username(), basic.password());

        match session.authenticate(creds).await {
            Ok(Some(user)) => {
                let user = ensure_email_verified(user)?;
                let user = Self(user);
                parts.extensions.insert(user.clone());
                Ok(user)
            }
            Ok(None) => Err(AppError::unauthorized("Unauthorized")),
            Err(err) => {
                let is_auth_rejection = match &err {
                    axum_login::Error::Session(_) => false,
                    axum_login::Error::Backend(err) => err.is_auth_rejection(),
                };

                if is_auth_rejection {
                    Err(AppError::unauthorized("Unauthorized"))
                } else {
                    log::error!(
                        target: "adapter.rest.extract.auth",
                        error:% = err;
                        "basic authentication failed"
                    );
                    Err(AppError::internal(err))
                }
            }
        }
    }
}
