use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::application;
use crate::application::correction::NewCorrectionDto;
use crate::application::release::{CreateError, UpsertCorrectionError};
use crate::application::release_image::ReleaseCoverArtInput;
use crate::domain::release::repo::Filter;
use crate::domain::release::{NewRelease, Release};
use crate::infra::error::Error;
use crate::presentation::api_response::{Data, Message};

type Service = state::ReleaseService;

const TAG: &str = "Release";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_release))
        .routes(routes!(update_release))
        .routes(routes!(find_release_by_keyword))
        .routes(routes!(find_release_by_id))
        .routes(routes!(upload_release_cover_art))
}

super::data! {
    DataOptionRelease, Option<Release>
    DataVecRelease, Vec<Release>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/{id}",
    responses(
		(status = 200, body = DataOptionRelease),
		Error,
    ),
)]
async fn find_release_by_id(
    State(service): State<Service>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Release>>, Error> {
    service.find_one(Filter::Id(id)).await.bimap_into()
}

#[derive(IntoParams, Deserialize)]
struct KwQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release",
    params(KwQuery),
    responses(
		(status = 200, body = DataVecRelease),
		Error,
    ),
)]
async fn find_release_by_keyword(
    State(service): State<Service>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<Release>>, Error> {
    service
        .find_many(Filter::Keyword(query.keyword))
        .await
        .bimap_into()
}

#[derive(IntoParams)]
struct RandomReleaseQuery {
    count: u64,
}

// TODO: set count limit, fix return type
// #[utoipa::path(
//     get,
//     path = "/release",
//     params(RandomReleaseQuery),
//     responses(
// 		(status = 200),
// 		Error
//     ),
// )]
// async fn random(
//     State(service): State<Service>,
//     Query(query): Query<RandomReleaseQuery>,
// ) -> Result<Data<Vec<entity::release::Model>>, Error> {
//     service.random(query.count).await.bimap_into()
// }

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
    path = "/release/{id}/cover_art",
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
