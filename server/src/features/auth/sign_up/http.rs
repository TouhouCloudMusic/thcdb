use axum::Json;
use axum::extract::State;
use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError, From};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::super::session::SessionBackendError;
use super::super::shared::{
    DataResendVerificationEmailResponse, DataSignUpResponse, TAG,
};
use super::super::{
    ResendVerificationEmailError, SignUpError, VerifyEmailError,
};
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::domain::auth::{
    ResendVerificationEmailRequest, ResendVerificationEmailResponse,
    SignUpRequest, SignUpResponse, VerifyEmailRequest,
};
use crate::domain::user::UserProfile;
use crate::features::user_profile::{self, DataUserProfile, load_profile};
use crate::shared::http::api_response::Data;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(sign_up))
        .routes(routes!(verify_email))
        .routes(routes!(resend_verification_email))
}

#[derive(Debug, Display, DeriveError, From)]
enum VerifyEmailRouteError {
    #[display("{_0}")]
    #[from]
    VerifyEmail(#[error(source)] VerifyEmailError),
    #[display("{_0}")]
    #[from]
    Session(#[error(source)] SessionBackendError),
    #[display("{_0}")]
    #[from]
    Profile(#[error(source)] user_profile::Error),
}

impl IntoResponse for VerifyEmailRouteError {
    fn into_response(self) -> axum::response::Response {
        match self {
            VerifyEmailRouteError::VerifyEmail(source) => {
                source.into_response()
            }
            VerifyEmailRouteError::Session(source) => source.into_response(),
            VerifyEmailRouteError::Profile(source) => source.into_response(),
        }
    }
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign-up",
    request_body = SignUpRequest,
    responses(
        (status = 200, body = DataSignUpResponse),
    ),
)]
async fn sign_up(
    State(auth_service): State<state::AuthService>,
    Json(req): Json<SignUpRequest>,
) -> Result<Data<SignUpResponse>, SignUpError> {
    let res = auth_service.sign_up(req).await?;

    Ok(Data::new(res))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/verify-email",
    request_body = VerifyEmailRequest,
    responses(
        (status = 200, body = DataUserProfile),
    ),
)]
async fn verify_email(
    mut auth_session: AuthSession,
    State(use_case): State<state::UserProfileService>,
    State(auth_service): State<state::AuthService>,
    Json(req): Json<VerifyEmailRequest>,
) -> Result<Data<UserProfile>, VerifyEmailRouteError> {
    let user = auth_service.verify_email(req).await?;

    auth_session
        .login(&user)
        .await
        .map_err(SessionBackendError::from)?;

    Ok(load_profile(&use_case, &user.name, Some(&user)).await?)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/resend-verification-email",
    request_body = ResendVerificationEmailRequest,
    responses(
        (status = 200, body = DataResendVerificationEmailResponse),
    ),
)]
async fn resend_verification_email(
    State(auth_service): State<state::AuthService>,
    Json(req): Json<ResendVerificationEmailRequest>,
) -> Result<Data<ResendVerificationEmailResponse>, ResendVerificationEmailError>
{
    let res = auth_service.resend_verification_email(req).await?;

    Ok(Data::new(res))
}
