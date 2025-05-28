use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use entity::enums::ReleaseType;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::data;
use super::extractor::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::application::artist::UpsertCorrectionError;
use crate::application::artist_image::{
    ArtistProfileImageInput, {self},
};
use crate::application::correction::NewCorrectionDto;
use crate::domain::artist::model::{Artist, NewArtist};
use crate::domain::artist_release::{
    AppearanceQuery, ArtistRelease, CreditQuery, DiscographyQuery,
};
use crate::domain::release::model::Release;
use crate::domain::repository::{Cursor, Paginated};
use crate::infra::error::Error;
use crate::presentation::api_response::{Data, Message};
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
        .routes(routes!(find_artist_discographies_init))
        .routes(routes!(find_artist_discographies_by_type))
        .routes(routes!(find_artist_apperances))
        .routes(routes!(get_artist_credits))
}

data!(
    DataOptionArtist, Option<Artist>
    DataVecArtist, Vec<Artist>
    DataVecRelease, Vec<Release>
    DataPaginatedArtistRelease, Paginated<ArtistRelease>
);

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}",
    responses(
        (status = 200, body = DataOptionArtist),
        Error
    ),
)]
async fn find_artist_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Artist>>, Error> {
    domain::artist::repo::Repo::find_by_id(&repo, id)
        .await
        .map_into()
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
        Error
    ),
)]
async fn find_artist_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<Artist>>, Error> {
    domain::artist::repo::Repo::find_by_name(&repo, &query.keyword)
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

// https://github.com/juhaku/utoipa/issues/841 IntoParams does not respect #[serde(flatten)]
#[derive(Deserialize, IntoParams)]
struct AppearanceQueryDto {
    cursor: u32,
    limit: u8,
}

impl AppearanceQueryDto {
    const fn into_query(self, artist_id: i32) -> AppearanceQuery {
        AppearanceQuery {
            artist_id,
            pagination: Cursor {
                at: self.cursor,
                limit: self.limit,
            },
        }
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/appearances",
    params(
        AppearanceQueryDto
    ),
    responses(
        (status = 200, body = DataPaginatedArtistRelease),
        Error
    ),
)]
async fn find_artist_apperances(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<AppearanceQueryDto>,
) -> Result<Data<Paginated<ArtistRelease>>, Error> {
    domain::artist_release::Repo::appearance(&repo, dto.into_query(id))
        .await
        .map_into()
}

#[derive(Deserialize, IntoParams, ToSchema)]
struct CreditQueryDto {
    cursor: u32,
    limit: u8,
}

impl CreditQueryDto {
    const fn into_query(self, artist_id: i32) -> CreditQuery {
        CreditQuery {
            artist_id,
            pagination: Cursor {
                at: self.cursor,
                limit: self.limit,
            },
        }
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/credits",
    params(
        CreditQueryDto
    ),
    responses(
        (status = 200, body = DataPaginatedArtistRelease),
        Error
    ),
)]
async fn get_artist_credits(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<CreditQueryDto>,
) -> Result<Data<Paginated<ArtistRelease>>, Error> {
    domain::artist_release::Repo::credit(&repo, dto.into_query(id))
        .await
        .map_into()
}

#[derive(Deserialize, IntoParams)]
struct DiscographyQueryDto {
    release_type: ReleaseType,
    cursor: u32,
    limit: u8,
}

impl DiscographyQueryDto {
    const fn into_query(self, artist_id: i32) -> DiscographyQuery {
        DiscographyQuery {
            artist_id,
            release_type: self.release_type,
            pagination: Cursor {
                at: self.cursor,
                limit: self.limit,
            },
        }
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/discographies",
    params(
        DiscographyQueryDto
    ),
    responses(
        (status = 200, body = DataPaginatedArtistRelease),
        Error
    ),
)]
async fn find_artist_discographies_by_type(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<DiscographyQueryDto>,
) -> Result<Data<Paginated<ArtistRelease>>, Error> {
    domain::artist_release::Repo::discography(&repo, dto.into_query(id))
        .await
        .map_into()
}

#[derive(Deserialize, IntoParams)]
struct InitDiscographyQueryDto {
    limit: u8,
}

impl InitDiscographyQueryDto {
    const fn to_query(
        &self,
        artist_id: i32,
        release_type: ReleaseType,
    ) -> DiscographyQuery {
        DiscographyQuery {
            artist_id,
            release_type,
            pagination: Cursor {
                at: 0,
                limit: self.limit,
            },
        }
    }
}

#[derive(Serialize, ToSchema)]
struct InitDiscography {
    album: Paginated<ArtistRelease>,
    ep: Paginated<ArtistRelease>,
    compilation: Paginated<ArtistRelease>,
    single: Paginated<ArtistRelease>,
    demo: Paginated<ArtistRelease>,
    other: Paginated<ArtistRelease>,
}

data! {
    DataInitDiscography, InitDiscography
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/discographies/init",
    params(
        InitDiscographyQueryDto
    ),
    responses(
        (status = 200, body = DataInitDiscography),
        Error
    ),
)]
async fn find_artist_discographies_init(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<InitDiscographyQueryDto>,
) -> Result<Data<InitDiscography>, Error> {
    let (album, ep, compilation, single, demo, other) = tokio::try_join!(
        domain::artist_release::Repo::discography(
            &repo,
            dto.to_query(id, ReleaseType::Album),
        ),
        domain::artist_release::Repo::discography(
            &repo,
            dto.to_query(id, ReleaseType::Ep),
        ),
        domain::artist_release::Repo::discography(
            &repo,
            dto.to_query(id, ReleaseType::Single),
        ),
        domain::artist_release::Repo::discography(
            &repo,
            dto.to_query(id, ReleaseType::Compilation),
        ),
        domain::artist_release::Repo::discography(
            &repo,
            dto.to_query(id, ReleaseType::Demo),
        ),
        domain::artist_release::Repo::discography(
            &repo,
            dto.to_query(id, ReleaseType::Other),
        ),
    )?;
    Ok(Data::new(InitDiscography {
        album,
        ep,
        compilation,
        single,
        demo,
        other,
    }))
}
