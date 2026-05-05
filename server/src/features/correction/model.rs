use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub enum HandleCorrectionMethod {
    Approve,
    Reject,
}

#[derive(Clone, Serialize, ToSchema)]
pub struct CorrectionUserSummary {
    pub id: i32,
    pub name: String,
}
