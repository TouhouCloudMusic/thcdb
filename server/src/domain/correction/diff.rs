use entity::enums::EntityType;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct CorrectionDiffEntry {
    pub path: String,
    pub before: Option<String>,
    pub after: Option<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct CorrectionDiff {
    pub entity_id: i32,
    pub entity_type: EntityType,
    pub base_correction_id: Option<i32>,
    pub base_history_id: Option<i32>,
    pub target_correction_id: i32,
    pub target_history_id: i32,
    pub changes: Vec<CorrectionDiffEntry>,
}
