use axum::Json;
use axum::extract::{DefaultBodyLimit, Path, State};
use axum::response::{IntoResponse, Response};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use bytes::Bytes;
use constants::REQUEST_BODY_MAX_SIZE;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewArtist;
use super::{credits, find, release, service};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::features::artist_image::{self, ArtistProfileImageInput};
use crate::features::correction::service::CorrectionUpsertMode;
use crate::features::correction::{
    CorrectionSubmitResult, NewCorrectionRequest, SubmissionError,
};
use crate::features::image_metadata::CurrentImageMetadata;
use crate::features::image_queue::description::SubmissionDescription;
use crate::shared::http::api_response::{AppError, Data};

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let upload_routes = OpenApiRouter::new()
        .routes(routes!(upload_artist_profile_image))
        .route_layer(DefaultBodyLimit::max(REQUEST_BODY_MAX_SIZE));

    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_artist))
                .routes(routes!(upsert_artist_correction))
                .routes(routes!(update_artist_pending_correction))
                .routes(routes!(get_artist_profile_image_metadata))
                .merge(upload_routes)
        })
        .finish();

    OpenApiRouter::new()
        .merge(find::router())
        .merge(credits::router())
        .merge(release::router())
        .merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist",
    request_body = NewCorrectionRequest<NewArtist>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn create_artist(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Json(input): Json<NewCorrectionRequest<NewArtist>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service.create(input.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist/{id}",
    request_body = NewCorrectionRequest<NewArtist>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn upsert_artist_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionRequest<NewArtist>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service
        .upsert_correction(
            id,
            dto.with_author(user),
            CorrectionUpsertMode::Create,
        )
        .await?;

    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist/{id}/correction/{correction_id}",
    params(
        ("id" = i32, Path, description = "Artist id"),
        ("correction_id" = i32, Path, description = "Pending correction id"),
    ),
    request_body = NewCorrectionRequest<NewArtist>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn update_artist_pending_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path((id, correction_id)): Path<(i32, i32)>,
    Json(dto): Json<NewCorrectionRequest<NewArtist>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service
        .upsert_correction(
            id,
            dto.with_author(user),
            CorrectionUpsertMode::Update { correction_id },
        )
        .await?;

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
) -> Result<Data<Option<CurrentImageMetadata>>, artist_image::Error> {
    let metadata = service.get_profile_image_metadata(id).await?;
    Ok(Data::from(metadata))
}

#[derive(Debug, ToSchema, TryFromMultipart)]
pub struct ArtistProfileImageFormData {
    #[form_data(field_name = "data", limit = "25MiB")]
    #[schema(
        rename = "data",
        value_type = String,
        format = Binary,
        maximum = 26214400,
        minimum = 1024
    )]
    pub file: FieldData<Bytes>,
    pub description: String,
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
) -> Response {
    let description = match SubmissionDescription::try_from(form.description) {
        Ok(description) => description,
        Err(err) => {
            return AppError::bad_request(err.to_string()).into_response();
        }
    };

    let dto = ArtistProfileImageInput {
        bytes: form.file.contents,
        user,
        artist_id: id,
        description,
    };
    service
        .upload_profile_image(dto)
        .await
        .map(Data::from)
        .into_response()
}
