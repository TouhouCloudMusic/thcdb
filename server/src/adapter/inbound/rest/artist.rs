use axum::Json;
use axum::extract::{Path, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use bytes::Bytes;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::{Data, Message};
use crate::application::artist::{CreateError, UpsertCorrectionError};
use crate::application::correction::CorrectionSubmissionResult;
use crate::application::artist_image::{
    ArtistProfileImageInput, {self},
};
use crate::application::correction::NewCorrectionDto;
use crate::domain::artist::NewArtist;

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_artist))
                .routes(routes!(upsert_artist_correction))
                .routes(routes!(upload_artist_profile_image))
        })
        .finish()
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
// #[axum::debug_handler]
async fn create_artist(
    CurrentUser(user): CurrentUser,
    State(service): State<state::ArtistService>,
    Json(input): Json<NewCorrectionDto<NewArtist>>,
) -> Result<Data<CorrectionSubmissionResult>, CreateError> {
    let result = service.create(input.with_author(user)).await?;
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
    State(service): State<state::ArtistService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewArtist>>,
) -> Result<Data<CorrectionSubmissionResult>, UpsertCorrectionError> {
    let result = service
        .upsert_correction(id, dto.with_author(user))
        .await?;
    Ok(Data::from(result))
}

#[derive(Debug, ToSchema, TryFromMultipart)]
pub struct ArtistProfileImageFormData {
    #[form_data(limit = "10MiB")]
    #[schema(
        value_type = String,
        format = Binary,
        maximum = 10485760,
        minimum = 1024
    )]
    pub data: FieldData<Bytes>,
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist/{id}/profile-image",
    responses(
        (status = 200, body = Message),
    )
)]
async fn upload_artist_profile_image(
    CurrentUser(user): CurrentUser,
    State(service): State<state::ArtistImageService>,
    Path(id): Path<i32>,
    TypedMultipart(form): TypedMultipart<ArtistProfileImageFormData>,
) -> Result<Message, artist_image::Error> {
    let data = form.data.contents;
    let dto = ArtistProfileImageInput {
        bytes: data,
        user,
        artist_id: id,
    };
    service.upload_profile_image(dto).await?;
    Ok(Message::ok())
}
