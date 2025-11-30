use axum::Json;
use axum::extract::{Path, State};
// use crate::dto::event::{Event, NewEvent};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::Message;
use crate::application::correction::NewCorrectionDto;
use crate::application::event::{self, CreateError};
use crate::domain::event::NewEvent;

const TAG: &str = "Event";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_event))
                .routes(routes!(upsert_event_correction))
        })
        .finish()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event",
    request_body = NewCorrectionDto<NewEvent>,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn create_event(
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
    ),
)]
async fn upsert_event_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<state::EventService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewEvent>>,
) -> Result<Message, event::UpsertCorrectionError> {
    service.upsert_correction(id, dto.with_author(user)).await?;

    Ok(Message::ok())
}
