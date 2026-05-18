use domain::shared::CursorResponse;
use serde::Serialize;
use utoipa::ToSchema;

use crate::features::correction::comment::CorrectionComment;
use crate::features::correction::model::CorrectionUserSummary;

#[derive(Serialize, ToSchema)]
pub struct CorrectionDetail {
    pub id: i32,
    pub status: entity::enums::CorrectionStatus,
    pub r#type: entity::enums::CorrectionType,
    pub entity_id: i32,
    pub entity_type: entity::enums::EntityType,
    pub entity_name: String,
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
    pub handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    pub author: CorrectionUserSummary,
    pub comments: CursorResponse<CorrectionComment>,
}
