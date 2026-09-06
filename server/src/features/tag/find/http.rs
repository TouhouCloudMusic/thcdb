use axum::extract::{Path, Query, State};
use domain::shared::PageResponse;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PageQuery, TagFilter};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::tag::list::TagListItem;
use crate::features::tag::model::Tag;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::{Data, Error as ApiError};

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
    DataPageTag, PageResponse<TagListItem>
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
) -> Result<Data<Option<Tag>>, DatabaseError> {
    super::repo::find_by_id(&repo, id).await.map(Data::from)
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
) -> Result<Data<Vec<Tag>>, DatabaseError> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .map(Data::from)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/explore",
    params(TagFilter, PageQuery),
    responses(
        (status = 200, body = DataPageTag),
        ApiError,
    ),
)]
async fn explore_tag(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<TagFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<TagListItem>>, DatabaseError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.tag.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Data::from)
}
