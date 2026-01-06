use entity::sea_orm_active_enums::TagType;
use entity::tag;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Select};
use serde::Deserialize;
use serde_with::{OneOrMany, serde_as};
use utoipa::{IntoParams, ToSchema};

pub use crate::shared::http::{
    CorrectionSortField, PaginationQuery, SortDirection,
};

#[serde_as]
#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
#[schema(as = TagFilter)]
pub struct TagFilter {
    #[serde_as(as = "Option<OneOrMany<_, serde_with::formats::PreferOne>>")]
    #[serde(default, rename = "tag_type", alias = "tag_type[]")]
    pub tag_types: Option<Vec<TagType>>,

    #[serde(default)]
    pub sort_field: Option<CorrectionSortField>,

    #[serde(default)]
    pub sort_direction: Option<SortDirection>,
}

impl TagFilter {
    pub const fn with_sort_defaults(mut self) -> Self {
        crate::shared::http::apply_sort_defaults(
            &mut self.sort_field,
            &mut self.sort_direction,
        );
        self
    }

    pub fn into_select(self) -> Select<tag::Entity> {
        let mut select = tag::Entity::find();

        if let Some(tag_types) = &self.tag_types {
            select = select.filter(tag::Column::Type.is_in(tag_types.clone()));
        }

        select
    }
}
