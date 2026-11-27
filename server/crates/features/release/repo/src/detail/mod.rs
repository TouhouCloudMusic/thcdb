use std::collections::HashMap;
use std::future::Future;

use domain::shared::Language;
use entity::release;
use entity::sea_orm_active_enums::ReleaseType;
use infra_db::error::DatabaseError;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QueryOrder,
    QuerySelect, Select,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use self::conv::conv_to_domain_model;
use self::loader::RelatedEntities;

mod conv;
mod loader;
mod model;

pub use model::{
    CatalogNumber, Release, ReleaseArtist, ReleaseCredit, ReleaseDisc,
    ReleaseTrack, SongRef,
};

#[derive(Clone, Debug)]
pub enum FindReleaseFilter {
    Id(i32),
    Keyword(String),
    ReleaseTypes(Vec<ReleaseType>),
}

fn filter_into_select(filter: FindReleaseFilter) -> Select<release::Entity> {
    match filter {
        FindReleaseFilter::Id(id) => {
            release::Entity::find().filter(release::Column::Id.eq(id))
        }
        FindReleaseFilter::Keyword(keyword) => {
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
        FindReleaseFilter::ReleaseTypes(release_types) => {
            release::Entity::find()
                .filter(release::Column::ReleaseType.is_in(release_types))
        }
    }
}

async fn find_many_impl<'a, F>(
    select: Select<release::Entity>,
    db: &impl ConnectionTrait,
    load_languages: impl FnOnce() -> F,
) -> Result<Vec<Release>, DbErr>
where
    F: Future<Output = Result<&'a HashMap<i32, Language>, DbErr>>,
{
    infra_db::trace("release.load_with_relations", async {
        let releases = select.all(db).await?;
        let related =
            RelatedEntities::load(&releases, db, load_languages).await?;

        let result = releases
            .into_iter()
            .enumerate()
            .map(|(i, release)| conv_to_domain_model(&release, &related, i))
            .collect();

        Ok(result)
    })
    .await
}

/// Loads one release, resolving the caller's language data when loading relations.
#[infra_db::observe("release.find_one")]
pub async fn find_one<'a, F>(
    db: &impl ConnectionTrait,
    filter: FindReleaseFilter,
    load_languages: impl FnOnce() -> F,
) -> Result<Option<Release>, DatabaseError>
where
    F: Future<Output = Result<&'a HashMap<i32, Language>, DbErr>>,
{
    let mut releases =
        find_many_impl(filter_into_select(filter).limit(1), db, load_languages)
            .await?;
    Ok(releases.pop())
}

/// Loads releases, resolving the caller's language data when loading relations.
#[infra_db::observe("release.find_many")]
pub async fn find_many<'a, F>(
    db: &impl ConnectionTrait,
    filter: FindReleaseFilter,
    load_languages: impl FnOnce() -> F,
) -> Result<Vec<Release>, DatabaseError>
where
    F: Future<Output = Result<&'a HashMap<i32, Language>, DbErr>>,
{
    Ok(find_many_impl(filter_into_select(filter), db, load_languages).await?)
}
