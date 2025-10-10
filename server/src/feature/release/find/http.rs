use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, Filter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::domain::release::Release;
use crate::infra::error::Error;

const TAG: &str = "Release";

data!(
    DataOptionRelease, Option<Release>
    DataVecRelease, Vec<Release>
);

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(find_release_by_id))
        .routes(routes!(find_release_by_keyword))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/{id}",
    responses(
        (status = 200, body = DataOptionRelease),
        Error,
    ),
)]
async fn find_release_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Release>>, Error> {
    repo::find_one(&repo, Filter::Id(id)).await.bimap_into()
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
        Error,
    ),
)]
async fn find_release_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<Release>>, Error> {
    repo::find_many(&repo, Filter::Keyword(query.keyword))
        .await
        .bimap_into()
}
