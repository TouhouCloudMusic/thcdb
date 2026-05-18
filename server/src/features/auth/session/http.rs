use axum::Json;
use axum::extract::State;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::super::shared::TAG;
use super::error::{SessionBackendError, SignInError};
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::features::auth::{AuthCredential, AuthnError};
use crate::features::user_profile::{
    DataUserProfile, UserProfile, load_profile,
};
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
) -> Result<Data<UserProfile>, super::SignInRouteError> {
    if auth_session.user.is_some() {
        return Err(SignInError::AlreadySignedIn.into());
    }
    let user = auth_session
        .authenticate(creds)
        .await
        .map_err(SessionBackendError::from)?
        .ok_or_else(AuthnError::authentication_failed)
        .map_err(SignInError::from)?;

    auth_session
        .login(&user)
        .await
        .map_err(SessionBackendError::from)?;

    Ok(load_profile(&use_case, &user.name, Some(&user)).await?)
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
    session
        .logout()
        .await
        .map_err(SessionBackendError::from)
        .map(|_| Message::ok())
}
