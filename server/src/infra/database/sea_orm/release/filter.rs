use entity::release;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::domain::release::repo::Filter;
impl Filter {
    pub(super) fn into_select(self) -> sea_orm::Select<release::Entity> {
        match self {
            Filter::Id(id) => {
                release::Entity::find().filter(release::Column::Id.eq(id))
            }
            Filter::Keyword(keyword) => {
                let search_term = Func::lower(keyword);
                release::Entity::find()
                    .filter(
                        Func::lower(release::Column::Title.into_expr())
                            .binary(PgBinOper::Similarity, search_term.clone()),
                    )
                    .order_by_asc(
                        Func::lower(release::Column::Title.into_expr())
                            .binary(PgBinOper::SimilarityDistance, search_term),
                    )
            }
        }
    }
}
