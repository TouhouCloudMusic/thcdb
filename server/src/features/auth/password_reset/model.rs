use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub const PASSWORD_RESET_CODE_EXPIRES_MINUTES: i64 = 10;
pub const PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS: i64 = 60;
pub const PASSWORD_RESET_KEY_EXPIRES_MINUTES: i64 = 5;

#[derive(Clone, Deserialize, ToSchema)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ForgotPasswordResponse {
    pub verification_code_expires_minutes: i64,
    pub resend_cooldown_seconds: i64,
}

impl Default for ForgotPasswordResponse {
    fn default() -> Self {
        Self {
            verification_code_expires_minutes:
                PASSWORD_RESET_CODE_EXPIRES_MINUTES,
            resend_cooldown_seconds:
                PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS,
        }
    }
}

#[derive(Clone, Deserialize, ToSchema)]
pub struct VerifyResetCodeRequest {
    pub email: String,
    #[schema(min_length = 6, max_length = 6, pattern = "^\\d{6}$")]
    pub code: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct VerifyResetCodeResponse {
    pub key_expires_minutes: i64,
    #[schema(value_type = String, format = DateTime)]
    pub key_expires_at: DateTime<FixedOffset>,
}

#[derive(Clone, Deserialize, ToSchema)]
pub struct ResetPasswordRequest {
    #[schema(max_length = 64)]
    pub key: String,
    pub password: String,
}
