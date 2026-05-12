use axum::Json;
use axum::extract::{Path, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use bytes::Bytes;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewArtist;
use super::{find, release, service};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application::correction::{
    CorrectionSubmissionResult, NewCorrectionDto,
};
use crate::domain::image::CurrentImageMetadata;
use crate::features::artist_image::ArtistProfileImageInput;
use crate::shared::http::api_response::{AppError, Data};

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_artist))
                .routes(routes!(upsert_artist_correction))
                .routes(routes!(get_artist_profile_image_metadata))
                .routes(routes!(upload_artist_profile_image))
        })
        .finish();

    OpenApiRouter::new()
        .merge(find::router())
        .merge(release::router())
        .merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist",
    request_body = NewCorrectionDto<NewArtist>,
    responses(
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn create_artist(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Json(input): Json<NewCorrectionDto<NewArtist>>,
) -> Result<Data<CorrectionSubmissionResult>, AppError> {
    let result = service::create(&repo, input.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist/{id}",
    request_body = NewCorrectionDto<NewArtist>,
    responses(
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn upsert_artist_correction(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    State(notification): State<state::NotificationService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewArtist>>,
) -> Result<Data<CorrectionSubmissionResult>, AppError> {
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
    path = "/artist/{id}/profile-image",
    responses(
        (status = 200, body = Data<Option<CurrentImageMetadata>>),
    )
)]
async fn get_artist_profile_image_metadata(
    CurrentUser(_user): CurrentUser,
    State(service): State<state::ArtistImageService>,
    Path(id): Path<i32>,
) -> Result<Data<Option<CurrentImageMetadata>>, AppError> {
    let metadata = service.get_profile_image_metadata(id).await?;
    Ok(Data::from(metadata))
}

#[derive(Debug, ToSchema, TryFromMultipart)]
pub struct ArtistProfileImageFormData {
    #[form_data(limit = "100MiB")]
    #[schema(
        value_type = String,
        format = Binary,
        maximum = 104857600,
        minimum = 1024
    )]
    pub data: FieldData<Bytes>,
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist/{id}/profile-image",
    request_body(
        content_type = "multipart/form-data",
        content = ArtistProfileImageFormData,
    ),
    responses(
        (status = 200, body = Data<i32>),
    )
)]
async fn upload_artist_profile_image(
    CurrentUser(user): CurrentUser,
    State(service): State<state::ArtistImageService>,
    Path(id): Path<i32>,
    TypedMultipart(form): TypedMultipart<ArtistProfileImageFormData>,
) -> Result<Data<i32>, AppError> {
    let data = form.data.contents;
    let dto = ArtistProfileImageInput {
        bytes: data,
        user,
        artist_id: id,
    };
    let entry_id = service.upload_profile_image(dto).await?;
    Ok(Data::from(entry_id))
}
