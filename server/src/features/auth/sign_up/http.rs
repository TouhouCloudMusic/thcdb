use axum::Json;
use axum::extract::State;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::super::session::SessionBackendError;
use super::super::shared::{
    DataResendVerificationEmailResponse, DataSignUpResponse, TAG,
};
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::domain::auth::{
    ResendVerificationEmailRequest, ResendVerificationEmailResponse,
    SignUpRequest, SignUpResponse, VerifyEmailRequest,
};
use crate::domain::user::UserProfile;
use crate::features::user_profile::{DataUserProfile, load_profile};
use crate::shared::http::api_response::{AppError, Data};

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(sign_up))
        .routes(routes!(verify_email))
        .routes(routes!(resend_verification_email))
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
) -> Result<Data<SignUpResponse>, AppError> {
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
) -> Result<Data<UserProfile>, AppError> {
    let user = auth_service.verify_email(req).await?;

    auth_session
        .login(&user)
        .await
        .map_err(SessionBackendError::from)
        .map_err(AppError::from)?;

    load_profile(&use_case, &user.name, Some(&user)).await
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
) -> Result<Data<ResendVerificationEmailResponse>, AppError> {
    let res = auth_service.resend_verification_email(req).await?;

    Ok(Data::new(res))
}
