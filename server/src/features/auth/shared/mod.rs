use crate::adapter::inbound::rest::data;
use crate::features::auth::{ResendVerificationEmailResponse, SignUpResponse};

pub(super) const TAG: &str = "Auth";

data!(
    pub(super),
    DataSignUpResponse, SignUpResponse,
    DataResendVerificationEmailResponse, ResendVerificationEmailResponse,
);
