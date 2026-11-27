use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SortDirection {
    Asc,
    Desc,
}

impl From<SortDirection> for sea_orm::Order {
    fn from(value: SortDirection) -> Self {
        match value {
            SortDirection::Asc => Self::Asc,
            SortDirection::Desc => Self::Desc,
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CorrectionSortField {
    CreatedAt,
    UpdatedAt,
}

pub(crate) const DEFAULT_CORRECTION_SORT: (CorrectionSortField, SortDirection) =
    (CorrectionSortField::CreatedAt, SortDirection::Desc);

pub const fn apply_sort_defaults(
    sort_field: &mut Option<CorrectionSortField>,
    sort_direction: &mut Option<SortDirection>,
) {
    if sort_field.is_none() {
        *sort_field = Some(DEFAULT_CORRECTION_SORT.0);
    }
    if sort_direction.is_none() {
        *sort_direction = Some(DEFAULT_CORRECTION_SORT.1);
    }
}
