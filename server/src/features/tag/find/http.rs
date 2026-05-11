use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PageQuery, TagFilter};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::PageResponse;
use crate::features::tag::model::Tag;
use crate::infra::database::error::DatabaseResultExt;
use crate::infra::error::Error;
use crate::shared::http::api_response::{AppError, Data};

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
    DataPageTag, PageResponse<Tag>
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
) -> Result<Data<Option<Tag>>, AppError> {
    super::repo::find_by_id(&repo, id)
        .await
        .with_operation("find tag by id")
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
    path = "/tag",
    params(KwArgs),
    responses(
        (status = 200, body = DataVecTag),
    ),
)]
async fn find_tag_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<Tag>>, AppError> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .with_operation("find tags by keyword")
        .map(Data::from)
        .map_err(Into::into)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/explore",
    params(TagFilter, PageQuery),
    responses(
        (status = 200, body = DataPageTag),
        Error,
    ),
)]
async fn explore_tag(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<TagFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<Tag>>, AppError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.tag.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .with_operation("explore tags")
        .map(Data::from)
        .map_err(Into::into)
}
