use utoipa::ToSchema;

use crate::domain::auth::{ResendVerificationEmailResponse, SignUpResponse};

pub(super) const TAG: &str = "Auth";

#[derive(ToSchema)]
pub(super) struct DataSignUpResponse {
    status: String,
    #[schema(required = true)]
    data: SignUpResponse,
}

#[derive(ToSchema)]
pub(super) struct DataResendVerificationEmailResponse {
    status: String,
    #[schema(required = true)]
    data: ResendVerificationEmailResponse,
}
