use entity::{song, song_language};
use sea_orm::{
    ColumnTrait, EntityTrait, QueryFilter, QuerySelect, QueryTrait, Select,
};
use sea_query::Expr;
use serde::{Deserialize, Serialize};
use serde_with::{DisplayFromStr, OneOrMany, serde_as};
use utoipa::{IntoParams, ToSchema};

pub use crate::shared::http::{
    CorrectionSortField, PaginationQuery, SortDirection,
};

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
        let mut select = song::Entity::find();

        if let Some(language_ids) = &self.language_ids {
            select = Self::apply_language_filter(select, language_ids.clone());
        }

        select
    }

    fn apply_language_filter(
        select: Select<song::Entity>,
        language_ids: Vec<i32>,
    ) -> Select<song::Entity> {
        let subquery = song_language::Entity::find()
            .select_only()
            .expr(1)
            .filter(Expr::eq(
                Expr::col((
                    song_language::Entity,
                    song_language::Column::SongId,
                )),
                Expr::col((song::Entity, song::Column::Id)),
            ))
            .filter(song_language::Column::LanguageId.is_in(language_ids));

        select.filter(Expr::exists(subquery.as_query().clone()))
    }
}
