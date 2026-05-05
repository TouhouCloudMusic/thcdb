use serde::Serialize;
use utoipa::ToSchema;

use crate::features::correction::model::CorrectionUserSummary;

#[derive(Serialize, ToSchema)]
pub(super) struct CorrectionRevisionSummary {
    pub(super) entity_history_id: i32,
    pub(super) author: CorrectionUserSummary,
    pub(super) description: String,
}
