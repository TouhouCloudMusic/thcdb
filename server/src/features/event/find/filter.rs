use chrono::NaiveDate;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

use crate::shared::http::{CorrectionSortField, SortDirection};

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
#[schema(as = EventFilter)]
pub struct EventFilter {
    pub start_date_from: Option<NaiveDate>,

    pub start_date_to: Option<NaiveDate>,

    #[serde(default)]
    pub sort_field: Option<CorrectionSortField>,

    #[serde(default)]
    pub sort_direction: Option<SortDirection>,
}
