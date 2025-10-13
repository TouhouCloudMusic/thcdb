use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::Message;
use crate::application;
use crate::application::correction::NewCorrectionDto;
use crate::application::release::{CreateError, UpsertCorrectionError};
use crate::application::release_image::ReleaseCoverArtInput;
use crate::domain::release::NewRelease;

type Service = state::ReleaseService;

const TAG: &str = "Release";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_release))
                .routes(routes!(update_release))
                .routes(routes!(upload_release_cover_art))
        })
        .finish()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release",
    request_body = NewCorrectionDto<NewRelease>,
    responses(
		(status = 200, body = Message),
        (status = 401),
		CreateError
    ),
)]
async fn create_release(
    CurrentUser(user): CurrentUser,
    service: State<Service>,
    Json(dto): Json<NewCorrectionDto<NewRelease>>,
) -> Result<Message, CreateError> {
    service.create(dto.with_author(user)).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release/{id}",
    request_body = NewCorrectionDto<NewRelease>,
    responses(
		(status = 200, body = Message),
        (status = 401),
		UpsertCorrectionError
    ),
)]
async fn update_release(
    CurrentUser(user): CurrentUser,
    service: State<Service>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewRelease>>,
) -> Result<Message, UpsertCorrectionError> {
    service.upsert_correction(id, dto.with_author(user)).await?;

    Ok(Message::ok())
}

#[derive(Debug, ToSchema, TryFromMultipart)]
pub struct ReleaseCoverArtFormData {
    #[form_data(limit = "10MiB")]
    #[schema(
        value_type = String,
        format = Binary,
        maximum = 10485760, // 10 MiB
        minimum = 1024    // 1 KiB
    )]
    pub data: FieldData<Bytes>,
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release/{id}/cover-art",
    request_body = ReleaseCoverArtFormData,
    responses(
        (status = 200, body = Message),
        (status = 401),
        application::release_image::Error
    )
)]

async fn upload_release_cover_art(
    CurrentUser(user): CurrentUser,
    State(service): State<state::ReleaseImageService>,
    Path(id): Path<i32>,
    TypedMultipart(form): TypedMultipart<ReleaseCoverArtFormData>,
) -> Result<Message, application::release_image::Error> {
    let dto = ReleaseCoverArtInput {
        bytes: form.data.contents,
        user,
        release_id: id,
    };
    service.upload_cover_art(dto).await?;
    Ok(Message::ok())
}
