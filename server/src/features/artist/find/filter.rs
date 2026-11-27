use entity::sea_orm_active_enums::ArtistType;
use enumset::EnumSet;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

pub use crate::shared::http::{CorrectionSortField, PageQuery, SortDirection};

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
#[schema(as = ArtistCommonFilter)]
pub struct CommonFilter {
    #[schema(value_type = HashSet<ArtistType>)]
    #[param(value_type = HashSet<ArtistType>)]
    #[serde(default, rename = "artist_type")]
    pub artist_types: Option<EnumSet<ArtistType>>,

    #[schema(value_type = HashSet<i32>)]
    #[param(value_type = HashSet<i32>)]
    #[serde(default)]
    pub exclusion: Option<Vec<i32>>,
}

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
#[schema(as = ArtistFilter)]
pub struct ArtistFilter {
    #[schema(value_type = Option<HashSet<ArtistType>>)]
    #[param(value_type = Option<HashSet<ArtistType>>)]
    #[serde(default, rename = "artist_type")]
    pub artist_types: Option<EnumSet<ArtistType>>,

    #[serde(default)]
    pub sort_field: Option<CorrectionSortField>,

    #[serde(default)]
    pub sort_direction: Option<SortDirection>,
}

impl ArtistFilter {
    pub const fn with_sort_defaults(mut self) -> Self {
        crate::shared::http::apply_sort_defaults(
            &mut self.sort_field,
            &mut self.sort_direction,
        );
        self
    }
}
