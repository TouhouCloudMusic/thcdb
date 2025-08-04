use axum::Json;
use axum::extract::{Path, Query, State};
// use crate::dto::event::{Event, NewEvent};
use flow::Pipe;
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::application::correction::NewCorrectionDto;
use crate::application::event::{self, CreateError};
use crate::domain::event::NewEvent;
use crate::domain::event::model::Event;
use crate::infra::error::Error;
use crate::presentation::api_response::{Data, Message};
use crate::presentation::error::ApiError;

const TAG: &str = "Event";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create))
        .routes(routes!(upsert_correction))
        .routes(routes!(find_event_by_id))
        .routes(routes!(find_event_by_keyword))
}

super::data! {
    DataOptionEvent, Option<Event>
    DataVecEvent, Vec<Event>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/event/{id}",
    responses(
        (status = 200, body = Data<Event>),
        ApiError
    ),
)]
async fn find_event_by_id(
    State(service): State<state::EventService>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Event>>, ApiError> {
    service.find_by_id(id).await?.pipe(Data::new).pipe(Ok)
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
        Error
    ),
)]
async fn find_event_by_keyword(
    State(service): State<state::EventService>,
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<Event>>, Error> {
    service.find_by_keyword(&query.keyword).await.bimap_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event",
    request_body = NewCorrectionDto<NewEvent>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        CreateError
    ),
)]
async fn create(
    CurrentUser(user): CurrentUser,
    State(service): State<state::EventService>,
    Json(dto): Json<NewCorrectionDto<NewEvent>>,
) -> Result<Message, CreateError> {
    service.create(dto.with_author(user)).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event/{id}",
    request_body = NewEvent,
    responses(
        (status = 200, body = Message),
        (status = 401),
        event::UpsertCorrectionError
    ),
)]
async fn upsert_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<state::EventService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewEvent>>,
) -> Result<Message, event::UpsertCorrectionError> {
    service.upsert_correction(id, dto.with_author(user)).await?;

    Ok(Message::ok())
}
