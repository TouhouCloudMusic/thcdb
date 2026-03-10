use axum::Json;
use axum::extract::State;
use axum::response::IntoResponse;
use axum_extra::extract::cookie::{Cookie as SetCookie, CookieJar, SameSite};
use chrono::{DateTime, FixedOffset};
use cookie::CookieBuilder;
use cookie::time::Duration;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::super::shared::TAG;
use super::error::{ForgotPasswordError, ResetPasswordError};
use super::service::{
    ForgotPasswordCommand, ForgotPasswordResult, ResetPasswordCommand,
    VerifiedResetPasswordSession, VerifyResetCodeCommand,
};
use crate::adapter::inbound::rest::api_response::{Data, Message};
use crate::adapter::inbound::rest::data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::infra::singleton::APP_CONFIG;

const RESET_PASSWORD_COOKIE_NAME: &str = "reset_password_session";

#[derive(Clone, Deserialize, ToSchema)]
struct ForgotPasswordRequest {
    email: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
struct ForgotPasswordResponse {
    verification_code_expires_minutes: i64,
    resend_cooldown_seconds: i64,
}

#[derive(Clone, Deserialize, ToSchema)]
struct VerifyResetCodeRequest {
    email: String,
    #[schema(min_length = 6, max_length = 6, pattern = "^\\d{6}$")]
    code: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
struct VerifyResetCodeResponse {
    key_expires_minutes: i64,
    #[schema(value_type = String, format = DateTime)]
    key_expires_at: DateTime<FixedOffset>,
}

#[derive(Clone, Deserialize, ToSchema)]
struct ResetPasswordRequest {
    password: String,
}

impl From<ForgotPasswordRequest> for ForgotPasswordCommand {
    fn from(req: ForgotPasswordRequest) -> Self {
        Self { email: req.email }
    }
}

impl From<ForgotPasswordResult> for ForgotPasswordResponse {
    fn from(res: ForgotPasswordResult) -> Self {
        Self {
            verification_code_expires_minutes: res
                .verification_code_expires_minutes,
            resend_cooldown_seconds: res.resend_cooldown_seconds,
        }
    }
}

impl From<VerifyResetCodeRequest> for VerifyResetCodeCommand {
    fn from(req: VerifyResetCodeRequest) -> Self {
        Self {
            email: req.email,
            code: req.code,
        }
    }
}

impl From<&VerifiedResetPasswordSession> for VerifyResetCodeResponse {
    fn from(res: &VerifiedResetPasswordSession) -> Self {
        Self {
            key_expires_minutes: res.key_expires_minutes,
            key_expires_at: res.key_expires_at,
        }
    }
}

fn apply_reset_password_cookie_config(
    builder: CookieBuilder<'_>,
) -> CookieBuilder<'_> {
    builder
        .path("/api/reset-password")
        .http_only(true)
        .same_site(SameSite::Strict)
        .secure(APP_CONFIG.middleware.session_secure)
}

fn build_reset_password_cookie(
    reset_key: &str,
    max_age_seconds: i64,
) -> SetCookie<'static> {
    apply_reset_password_cookie_config(SetCookie::build((
        RESET_PASSWORD_COOKIE_NAME,
        reset_key.to_owned(),
    )))
    .max_age(Duration::seconds(max_age_seconds))
    .build()
}

fn clear_reset_password_cookie() -> SetCookie<'static> {
    apply_reset_password_cookie_config(SetCookie::build((
        RESET_PASSWORD_COOKIE_NAME,
        String::new(),
    )))
    .removal()
    .build()
}

data!(DataForgotPasswordResponse, ForgotPasswordResponse);
data!(DataVerifyResetCodeResponse, VerifyResetCodeResponse);

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(forgot_password))
        .routes(routes!(verify_reset_code))
        .routes(routes!(reset_password))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/forgot-password",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, body = DataForgotPasswordResponse),
    ),
)]
async fn forgot_password(
    State(auth_service): State<state::AuthService>,
    Json(req): Json<ForgotPasswordRequest>,
) -> Result<Data<ForgotPasswordResponse>, ForgotPasswordError> {
    let res = auth_service.forgot_password(req.into()).await?;

    Ok(Data::new(res.into()))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/verify-reset-code",
    request_body = VerifyResetCodeRequest,
    responses(
        (status = 200, body = DataVerifyResetCodeResponse),
    ),
)]
async fn verify_reset_code(
    State(auth_service): State<state::AuthService>,
    jar: CookieJar,
    Json(req): Json<VerifyResetCodeRequest>,
) -> impl IntoResponse {
    match auth_service.verify_reset_code(req.into()).await {
        Ok(res) => {
            let now: chrono::DateTime<chrono::FixedOffset> =
                chrono::Utc::now().into();
            let max_age_seconds =
                (res.key_expires_at - now).num_seconds().max(0);

            let jar =
                jar.add(build_reset_password_cookie(&res.key, max_age_seconds));

            (jar, Data::new(VerifyResetCodeResponse::from(&res)))
                .into_response()
        }
        Err(err) => err.into_response(),
    }
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/reset-password",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn reset_password(
    State(auth_service): State<state::AuthService>,
    jar: CookieJar,
    Json(req): Json<ResetPasswordRequest>,
) -> impl IntoResponse {
    let Some(reset_key) = jar.get(RESET_PASSWORD_COOKIE_NAME) else {
        return (
            jar.remove(clear_reset_password_cookie()),
            ResetPasswordError::InvalidOrExpiredResetKey.into_response(),
        )
            .into_response();
    };

    let req = ResetPasswordCommand {
        key: reset_key.value().to_string(),
        password: req.password,
    };

    match auth_service.reset_password(req).await {
        Ok(()) => (jar.remove(clear_reset_password_cookie()), Message::ok())
            .into_response(),
        Err(err @ ResetPasswordError::InvalidOrExpiredResetKey) => (
            jar.remove(clear_reset_password_cookie()),
            err.into_response(),
        )
            .into_response(),
        Err(err) => err.into_response(),
    }
}
