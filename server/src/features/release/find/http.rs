use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, FindReleaseFilter};
use super::{PaginationQuery, ReleaseFilter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::Paginated;
use crate::features::release::model::Release;
use crate::infra::error::Error;

const TAG: &str = "Release";

data!(
    DataOptionRelease, Option<Release>
    DataVecRelease, Vec<Release>
    DataPaginatedRelease, Paginated<Release>
);

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_release_by_id))
                .routes(routes!(find_release_by_keyword))
                .routes(routes!(explore_release))
        })
        .finish()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/{id}",
    responses(
        (status = 200, body = DataOptionRelease),
    ),
)]
async fn find_release_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Release>>, Error> {
    repo::find_one(&repo, FindReleaseFilter::Id(id))
        .await
        .bimap_into()
}

#[derive(IntoParams, Deserialize)]
struct KwQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release",
    params(KwQuery),
    responses(
        (status = 200, body = DataVecRelease),
    ),
)]
async fn find_release_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<Release>>, Error> {
    repo::find_many(&repo, FindReleaseFilter::Keyword(query.keyword))
        .await
        .bimap_into()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/explore",
    params(ReleaseFilter, PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedRelease),
        Error,
    ),
)]
async fn explore_release(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<ReleaseFilter>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<Paginated<Release>>, Error> {
    let normalized = filter.with_sort_defaults();
    tracing::info!(?normalized, "explore_release: incoming query");
    repo::find_by_filter(&repo, normalized, pagination)
        .await
        .bimap_into()
}
