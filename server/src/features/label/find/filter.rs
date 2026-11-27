use chrono::NaiveDate;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

pub use crate::shared::http::{CorrectionSortField, PageQuery, SortDirection};

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
#[schema(as = LabelFilter)]
pub struct LabelFilter {
    pub founded_date_from: Option<NaiveDate>,

    pub founded_date_to: Option<NaiveDate>,

    pub is_dissolved: Option<bool>,

    #[serde(default)]
    pub sort_field: Option<CorrectionSortField>,

    #[serde(default)]
    pub sort_direction: Option<SortDirection>,
}

impl LabelFilter {
    pub const fn with_sort_defaults(mut self) -> Self {
        crate::shared::http::apply_sort_defaults(
            &mut self.sort_field,
            &mut self.sort_direction,
        );
        self
    }
}
