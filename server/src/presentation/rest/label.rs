use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state;
use super::state::ArcAppState;
use crate::api_response::{Data, Message};
use crate::application::correction::NewCorrectionDto;
use crate::application::label::{CreateError, UpsertCorrectionError};
use crate::domain::label::{Label, NewLabel};
use crate::error::ServiceError;
use crate::utils::MapInto;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_label))
        .routes(routes!(upsert_label_correction))
        .routes(routes!(find_label_by_id))
        .routes(routes!(find_label_by_keyword))
}

super::data! {
    DataOptionLabel, Option<Label>
    DataVecLabel, Vec<Label>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label/{id}",
    responses(
        (status = 200, body = DataOptionLabel),
        (status = 401),
        ServiceError
    ),
)]
async fn find_label_by_id(
    label_service: State<state::LabelService>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Label>>, ServiceError> {
    label_service.find_by_id(id).await.map_into()
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
        (status = 401),
        ServiceError
    ),
)]
async fn find_label_by_keyword(
    label_service: State<state::LabelService>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<Label>>, ServiceError> {
    label_service
        .find_by_keyword(&query.keyword)
        .await
        .map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label",
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        ServiceError
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
