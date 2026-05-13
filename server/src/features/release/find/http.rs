use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, FindReleaseFilter};
use super::{PageQuery, ReleaseFilter};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::PageResponse;
use crate::features::release::model::Release;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::{Data, Error as ApiError};

const TAG: &str = "Release";

data!(
    DataOptionRelease, Option<Release>
    DataVecRelease, Vec<Release>
    DataPageRelease, PageResponse<Release>
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
) -> Result<Data<Option<Release>>, DatabaseError> {
    repo::find_one(&repo, FindReleaseFilter::Id(id))
        .await
        .map(Data::from)
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
) -> Result<Data<Vec<Release>>, DatabaseError> {
    repo::find_many(&repo, FindReleaseFilter::Keyword(query.keyword))
        .await
        .map(Data::from)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/explore",
    params(ReleaseFilter, PageQuery),
    responses(
        (status = 200, body = DataPageRelease),
        ApiError,
    ),
)]
async fn explore_release(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<ReleaseFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<Release>>, DatabaseError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.release.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Data::from)
}
