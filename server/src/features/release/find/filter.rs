use entity::release;
use entity::sea_orm_active_enums::ReleaseType;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Select};
use serde::Deserialize;
use serde_with::{OneOrMany, serde_as};
use utoipa::{IntoParams, ToSchema};

pub use crate::shared::http::{
    CorrectionSortField, PaginationQuery, SortDirection,
};

#[serde_as]
#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
#[schema(as = ReleaseFilter)]
pub struct ReleaseFilter {
    #[serde_as(as = "Option<OneOrMany<_, serde_with::formats::PreferOne>>")]
    #[serde(default, rename = "release_type", alias = "release_type[]")]
    pub release_types: Option<Vec<ReleaseType>>,

    #[serde(default)]
    pub sort_field: Option<CorrectionSortField>,

    #[serde(default)]
    pub sort_direction: Option<SortDirection>,
}

impl ReleaseFilter {
    pub const fn with_sort_defaults(mut self) -> Self {
        crate::shared::http::apply_sort_defaults(
            &mut self.sort_field,
            &mut self.sort_direction,
        );
        self
    }
}

impl ReleaseFilter {
    pub fn into_select(self) -> Select<release::Entity> {
        let mut select = release::Entity::find();

        if let Some(release_types) = &self.release_types {
            select = select.filter(
                release::Column::ReleaseType.is_in(release_types.clone()),
            );
        }

        select
    }
}
