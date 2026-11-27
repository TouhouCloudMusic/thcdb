use entity::song;
use sea_orm::Select;
use serde::{Deserialize, Serialize};
use serde_with::{DisplayFromStr, OneOrMany, serde_as};
use utoipa::{IntoParams, ToSchema};

pub use crate::shared::http::{CorrectionSortField, PageQuery, SortDirection};

#[serde_as]
#[derive(
    Clone, Debug, Default, Deserialize, Serialize, ToSchema, IntoParams,
)]
#[schema(as = SongFilter)]
pub struct SongFilter {
    #[serde(
        default,
        rename = "language_id",
        alias = "language_id[]",
        alias = "language_ids"
    )]
    #[serde_as(as = "Option<OneOrMany<DisplayFromStr>>")]
    pub language_ids: Option<Vec<i32>>,

    #[serde(default)]
    pub sort_field: Option<CorrectionSortField>,

    #[serde(default)]
    pub sort_direction: Option<SortDirection>,
}

impl SongFilter {
    pub const fn with_sort_defaults(mut self) -> Self {
        crate::shared::http::apply_sort_defaults(
            &mut self.sort_field,
            &mut self.sort_direction,
        );
        self
    }

    pub fn into_select(self) -> Select<song::Entity> {
        song_repo::read::select_by_language_ids(self.language_ids)
    }
}
