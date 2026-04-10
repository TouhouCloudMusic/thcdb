use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::super::shared::TAG;
use super::error::{SessionBackendError, SignInError};
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::domain::auth::AuthCredential;
use crate::domain::user::UserProfile;
use crate::features::user_profile::{DataUserProfile, load_profile};
use crate::shared::http::api_response::{Data, Message};

pub fn public_router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().routes(routes!(sign_in))
}

pub fn private_router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().routes(routes!(sign_out))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign-in",
    request_body = AuthCredential,
    responses(
        (status = 200, body = DataUserProfile),
    )
)]
async fn sign_in(
    mut auth_session: state::AuthSession,
    State(use_case): State<state::UserProfileService>,
    Json(creds): Json<AuthCredential>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    if auth_session.user.is_some() {
        return Err(SignInError::AlreadySignedIn.into_response());
    }
    let user = auth_session
        .authenticate(creds)
        .await
        .map_err(SessionBackendError::from)
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| StatusCode::UNAUTHORIZED.into_response())?;

    auth_session
        .login(&user)
        .await
        .map_err(SessionBackendError::from)
        .map_err(IntoResponse::into_response)?;

    load_profile(&use_case, &user.name, Some(&user)).await
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/sign-out",
    responses(
        (status = 200, body = Message),
    )
)]
async fn sign_out(
    mut session: AuthSession,
) -> Result<Message, SessionBackendError> {
    Ok(session.logout().await.map(|_| Message::ok())?)
}
