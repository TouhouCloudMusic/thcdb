use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewRelease;
use super::{find, service};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application::correction::{
    CorrectionSubmissionResult, NewCorrectionDto,
};
use crate::domain::image::CurrentImageMetadata;
use crate::features::correction::SubmissionError;
use crate::features::release_image::{
    Error as ImageError, ReleaseCoverArtInput,
};
use crate::shared::http::api_response::Data;

const TAG: &str = "Release";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_release))
                .routes(routes!(get_release_cover_art_metadata))
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
) -> Result<Data<CorrectionSubmissionResult>, SubmissionError> {
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
    State(notification): State<state::NotificationService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewRelease>>,
) -> Result<Data<CorrectionSubmissionResult>, SubmissionError> {
    let user_id = user.id;
    let result =
        service::upsert_correction(&repo, id, dto.with_author(user)).await?;

    notification
        .notify_correction_needs_review_best_effort(
            result.correction_id,
            &[user_id],
        )
        .await;

    Ok(Data::from(result))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/{id}/cover-art",
    responses(
        (status = 200, body = Data<Option<CurrentImageMetadata>>),
    )
)]
async fn get_release_cover_art_metadata(
    CurrentUser(_user): CurrentUser,
    State(service): State<state::ReleaseImageService>,
    Path(id): Path<i32>,
) -> Result<Data<Option<CurrentImageMetadata>>, ImageError> {
    let metadata = service.get_cover_art_metadata(id).await?;
    Ok(Data::from(metadata))
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
    request_body(
        content_type = "multipart/form-data",
        content = ReleaseCoverArtFormData,
    ),
    responses(
        (status = 200, body = Data<i32>),
    )
)]
async fn upload_release_cover_art(
    CurrentUser(user): CurrentUser,
    State(service): State<state::ReleaseImageService>,
    Path(id): Path<i32>,
    TypedMultipart(form): TypedMultipart<ReleaseCoverArtFormData>,
) -> Result<Data<i32>, ImageError> {
    let dto = ReleaseCoverArtInput {
        bytes: form.data.contents,
        user,
        release_id: id,
    };
    let entry_id = service.upload_cover_art(dto).await?;
    Ok(Data::from(entry_id))
}
