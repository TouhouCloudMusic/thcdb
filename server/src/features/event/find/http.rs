use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{EventFilter, PageQuery};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::PageResponse;
use crate::features::event::model::Event;
use crate::infra::error::Error;
use crate::shared::http::api_response::Data;

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
) -> Result<Data<Option<Event>>, Error> {
    super::repo::find_by_id(&repo, id).await.bimap_into()
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
) -> Result<Data<Vec<Event>>, Error> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .bimap_into()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/event/explore",
    params(EventFilter, PageQuery),
    responses(
        (status = 200, body = DataPageEvent),
        Error,
    ),
)]
async fn explore_event(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<EventFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<Event>>, Error> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.event.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .bimap_into()
}
