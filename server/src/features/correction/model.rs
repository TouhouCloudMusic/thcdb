use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub enum HandleCorrectionMethod {
    Approve,
    Reject,
}
