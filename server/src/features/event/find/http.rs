use axum::extract::{Path, Query, State};
use domain::shared::PageResponse;
use entity::enums::EntityType;
use event_repo::{Event, EventListItem};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::filter::EventFilter;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;
use crate::shared::http::api_response::{Data, Error as ApiError};
use crate::shared::http::{DEFAULT_CORRECTION_SORT, PageQuery};

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
    DataPageEvent, PageResponse<EventListItem>
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
) -> Result<Data<Option<Event>>, DatabaseError> {
    let event = event_repo::find_by_id(&repo.conn, id).await?;
    Ok(Data::from(event))
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
) -> Result<Data<Vec<Event>>, DatabaseError> {
    let events =
        event_repo::find_by_keyword(&repo.conn, &query.keyword).await?;
    Ok(Data::from(events))
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
) -> Result<Data<PageResponse<EventListItem>>, DatabaseError> {
    let (default_field, default_direction) = DEFAULT_CORRECTION_SORT;
    let sort_field = filter.sort_field.unwrap_or(default_field);
    let sort_direction = filter.sort_direction.unwrap_or(default_direction);
    log::info!(
        target: "features.event.find.http",
        sort_field:? = sort_field,
        sort_direction:? = sort_direction,
        start_date_from:? = filter.start_date_from,
        start_date_to:? = filter.start_date_to;
        "incoming explore query"
    );

    let entity_ids = crate::features::correction::correction_sorted_entity_ids(
        &repo.conn,
        EntityType::Event,
        sort_field,
        sort_direction.into(),
    )
    .await
    .db_context("list correction-sorted event ids")?;
    let events = event_repo::find_list_items(
        &repo.conn,
        &entity_ids,
        filter.start_date_from,
        filter.start_date_to,
    )
    .await?;
    let events = utils::sort_by_id_list(events, &entity_ids, |event| event.id);
    Ok(Data::from(utils::page_from_items(events, &pagination)))
}
