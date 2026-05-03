use serde::Serialize;
use utoipa::ToSchema;

use crate::domain::shared::CursorResponse;
use crate::features::correction::comment::CorrectionComment;

#[derive(Serialize, ToSchema)]
pub struct CorrectionDetail {
    pub id: i32,
    pub status: entity::enums::CorrectionStatus,
    pub r#type: entity::enums::CorrectionType,
    pub entity_id: i32,
    pub entity_type: entity::enums::EntityType,
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
    pub handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    pub comments: CursorResponse<CorrectionComment>,
}
