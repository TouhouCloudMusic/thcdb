use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{LabelFilter, PageQuery};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::PageResponse;
use crate::features::label::model::Label;
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::{AppError, Data, Error as ApiError};

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
    DataPageLabel, PageResponse<Label>
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
) -> Result<Data<Option<Label>>, AppError> {
    super::repo::find_by_id(&repo, id)
        .await
        .with_operation("find label by id")
        .map(Data::from)
        .map_err(Into::into)
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
) -> Result<Data<Vec<Label>>, AppError> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .with_operation("find labels by keyword")
        .map(Data::from)
        .map_err(Into::into)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label/explore",
    params(LabelFilter, PageQuery),
    responses(
        (status = 200, body = DataPageLabel),
        ApiError,
    ),
)]
async fn explore_label(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<LabelFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<Label>>, AppError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.label.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .with_operation("explore labels")
        .map(Data::from)
        .map_err(Into::into)
}
