use serde::Serialize;
use user_core::UserSummary;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub(super) struct CorrectionRevisionSummary {
    pub(super) entity_history_id: i32,
    pub(super) author: UserSummary,
    pub(super) description: String,
}
