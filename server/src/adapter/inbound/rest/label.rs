use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state;
use super::state::ArcAppState;
use crate::adapter::inbound::rest::api_response::Message;
use crate::application::correction::NewCorrectionDto;
use crate::application::label::{CreateError, UpsertCorrectionError};
use crate::domain::label::NewLabel;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_label))
        .routes(routes!(upsert_label_correction))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label",
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        CreateError
    ),
)]

async fn create_label(
    CurrentUser(user): CurrentUser,
    label_service: State<state::LabelService>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
) -> Result<Message, CreateError> {
    label_service.create(dto.with_author(user)).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label/{id}",
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        UpsertCorrectionError
    ),
)]
async fn upsert_label_correction(
    CurrentUser(user): CurrentUser,
    label_service: State<state::LabelService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
) -> Result<Message, UpsertCorrectionError> {
    label_service
        .upsert_correction(id, dto.with_author(user))
        .await?;

    Ok(Message::ok())
}
