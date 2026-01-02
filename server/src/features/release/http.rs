use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::error::{CreateError, UpsertCorrectionError};
use super::model::NewRelease;
use super::{find, service};
use crate::adapter::inbound::rest::api_response::{Data, Message};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application;
use crate::application::correction::{
    CorrectionSubmissionResult, NewCorrectionDto,
};
use crate::application::release_image::ReleaseCoverArtInput;

const TAG: &str = "Release";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_release))
                .routes(routes!(update_release))
                .routes(routes!(upload_release_cover_art))
        })
        .finish();

    OpenApiRouter::new().merge(find::router()).merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release",
    request_body = NewCorrectionDto<NewRelease>,
    responses(
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn create_release(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Json(dto): Json<NewCorrectionDto<NewRelease>>,
) -> Result<Data<CorrectionSubmissionResult>, CreateError> {
    let result = service::create(&repo, dto.with_author(user)).await?;

    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release/{id}",
    request_body = NewCorrectionDto<NewRelease>,
    responses(
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn update_release(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewRelease>>,
) -> Result<Data<CorrectionSubmissionResult>, UpsertCorrectionError> {
    let result = service::upsert_correction(&repo, id, dto.with_author(user))
        .await?;

    Ok(Data::from(result))
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
