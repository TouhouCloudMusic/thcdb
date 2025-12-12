use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CorrectionSortField {
    CreatedAt,
    HandledAt,
}

pub const fn apply_sort_defaults(
    sort_field: &mut Option<CorrectionSortField>,
    sort_direction: &mut Option<SortDirection>,
) {
    if sort_field.is_none() {
        *sort_field = Some(CorrectionSortField::CreatedAt);
    }
    if sort_direction.is_none() {
        *sort_direction = Some(SortDirection::Desc);
    }
}
