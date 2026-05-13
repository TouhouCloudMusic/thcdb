use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{EventFilter, PageQuery};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::PageResponse;
use crate::features::event::model::Event;
use crate::shared::http::api_response::{AppError, Data, Error as ApiError};

const TAG: &str = "Event";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_event_by_id))
                .routes(routes!(find_event_by_keyword))
                .routes(routes!(explore_event))
        })
        .finish()
}

data! {
    DataOptionEvent, Option<Event>
    DataVecEvent, Vec<Event>
    DataPageEvent, PageResponse<Event>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/event/{id}",
    responses(
        (status = 200, body = DataOptionEvent),
    ),
)]
async fn find_event_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Event>>, AppError> {
    super::repo::find_by_id(&repo, id)
        .await
        .map(Data::from)
        .map_err(Into::into)
}

#[derive(Deserialize, IntoParams)]
struct KeywordQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/event",
    params(
        KeywordQuery
    ),
    responses(
        (status = 200, body = DataVecEvent),
    ),
)]
async fn find_event_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<Event>>, AppError> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .map(Data::from)
        .map_err(Into::into)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/event/explore",
    params(EventFilter, PageQuery),
    responses(
        (status = 200, body = DataPageEvent),
        ApiError,
    ),
)]
async fn explore_event(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<EventFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<Event>>, AppError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.event.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Data::from)
        .map_err(Into::into)
}
