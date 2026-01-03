use entity::artist;
use enumset::EnumSet;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Select};
use sea_query::{Cond, SimpleExpr};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

use crate::features::artist::model::ArtistType;
pub use crate::shared::http::{
    CorrectionSortField, PaginationQuery, SortDirection,
};

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum FindManyFilter {
    Keyword(String),
}

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

impl From<CommonFilter> for SimpleExpr {
    fn from(value: CommonFilter) -> Self {
        Cond::all()
            .add_option(
                value
                    .artist_types
                    .map(|x| artist::Column::ArtistType.is_in(x)),
            )
            .add_option(value.exclusion.and_then(|x| {
                if x.is_empty() {
                    None
                } else {
                    Some(artist::Column::Id.is_not_in(x))
                }
            }))
            .into()
    }
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

    pub fn into_select(self) -> Select<artist::Entity> {
        let mut select = artist::Entity::find();

        if let Some(artist_types) = &self.artist_types {
            select =
                select.filter(artist::Column::ArtistType.is_in(*artist_types));
        }

        select
    }
}
