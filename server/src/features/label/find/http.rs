use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{LabelFilter, PaginationQuery};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::label::Label;
use crate::domain::shared::Paginated;
use crate::infra::error::Error;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_label_by_id))
                .routes(routes!(find_label_by_keyword))
                .routes(routes!(explore_label))
        })
        .finish()
}

data! {
    DataOptionLabel, Option<Label>
    DataVecLabel, Vec<Label>
    DataPaginatedLabel, Paginated<Label>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label/{id}",
    responses(
        (status = 200, body = DataOptionLabel),
    ),
)]
async fn find_label_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Label>>, Error> {
    super::repo::find_by_id(&repo, id).await.bimap_into()
}

#[derive(IntoParams, Deserialize)]
struct KwArgs {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label",
    params(KwArgs),
    responses(
        (status = 200, body = DataVecLabel),
    ),
)]
async fn find_label_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<Label>>, Error> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .bimap_into()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label/explore",
    params(LabelFilter, PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedLabel),
        Error,
    ),
)]
async fn explore_label(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<LabelFilter>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<Paginated<Label>>, Error> {
    let normalized = filter.with_sort_defaults();
    tracing::info!(?normalized, "explore_label: incoming query");
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .bimap_into()
}
