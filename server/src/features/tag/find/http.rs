use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PaginationQuery, TagFilter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::Paginated;
use crate::features::tag::model::Tag;
use crate::infra::error::Error;

const TAG: &str = "Tag";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_tag_by_id))
                .routes(routes!(find_tag_by_keyword))
                .routes(routes!(explore_tag))
        })
        .finish()
}

data! {
    DataOptionTag, Option<Tag>
    DataVecTag, Vec<Tag>
    DataPaginatedTag, Paginated<Tag>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/{id}",
    responses(
        (status = 200, body = DataOptionTag),
    ),
)]
async fn find_tag_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Tag>>, Error> {
    super::repo::find_by_id(&repo, id).await.bimap_into()
}

#[derive(IntoParams, Deserialize)]
struct KwArgs {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag",
    params(KwArgs),
    responses(
        (status = 200, body = DataVecTag),
    ),
)]
async fn find_tag_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<Tag>>, Error> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .bimap_into()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/explore",
    params(TagFilter, PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedTag),
        Error,
    ),
)]
async fn explore_tag(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<TagFilter>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<Paginated<Tag>>, Error> {
    let normalized = filter.with_sort_defaults();
    tracing::info!(?normalized, "explore_tag: incoming query");
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .bimap_into()
}
