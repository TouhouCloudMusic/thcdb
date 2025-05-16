use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::data;
use super::extractor::CurrentUser;
use super::state::{self, ArcAppState};
use crate::api_response::{Data, Message};
use crate::application::artist::UpsertCorrectionError;
use crate::application::artist_image::{self, ArtistProfileImageInput};
use crate::application::correction::NewCorrectionDto;
use crate::domain::artist::model::{Artist, NewArtist};
use crate::error::{InfraError, ServiceError};
use crate::utils::MapInto;
use crate::{application, domain};

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_artist))
        .routes(routes!(upsert_artist_correction))
        .routes(routes!(upload_artist_profile_image))
        .routes(routes!(find_artist_by_id))
        .routes(routes!(find_artist_by_keyword))
}

data!(
    DataArtist, Artist
    DataVecArtist, Vec<Artist>
);

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}",
    responses(
        (status = 200, body = DataArtist),
        ServiceError
    ),
)]
async fn find_artist_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Artist>, ServiceError> {
    let artist = domain::artist::repository::Repo::find_by_id(&repo, id)
        .await
        .map_err(ServiceError::from)?;

    artist.map_or_else(
        || {
            Err(ServiceError::EntityNotFound {
                entity_name: "artist",
            })
        },
        |artist| Ok(Data::new(artist)),
    )
}

#[derive(Deserialize, IntoParams)]
struct KeywordQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist",
    params(
        KeywordQuery
    ),
    responses(
        (status = 200, body = DataVecArtist),
        InfraError
    ),
)]
async fn find_artist_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<Artist>>, InfraError> {
    domain::artist::repository::Repo::find_by_name(&repo, &query.keyword)
        .await
        .map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist",
    request_body = NewCorrectionDto<NewArtist>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        application::artist::CreateError
    ),
)]
#[axum::debug_handler]
async fn create_artist(
    CurrentUser(user): CurrentUser,
    State(service): State<state::ArtistService>,
    Json(input): Json<NewCorrectionDto<NewArtist>>,
) -> Result<Message, application::artist::CreateError> {
    service
        .create(input.with_author(user))
        .await
        .map(|()| Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/artist/{id}",
    request_body = NewCorrectionDto<NewArtist>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        UpsertCorrectionError
    ),
)]
async fn upsert_artist_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<state::ArtistService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewArtist>>,
) -> Result<Message, UpsertCorrectionError> {
    service.upsert_correction(id, dto.with_author(user)).await?;

    Ok(Message::ok())
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
    path = "/artist/{id}/profile_image",
    responses(
        (status = 200, body = Message),
        artist_image::Error
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
