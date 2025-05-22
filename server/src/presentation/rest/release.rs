use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::application::correction::NewCorrectionDto;
use crate::application::release::{CreateError, UpsertCorrectionError};
use crate::domain::release::repo::Filter;
use crate::domain::release::{NewRelease, Release};
use crate::infra::error::Error;
use crate::presentation::api_response::{Data, Message};
use crate::utils::MapInto;

type Service = state::ReleaseService;

const TAG: &str = "Release";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_release))
        .routes(routes!(update_release))
        .routes(routes!(find_release_by_keyword))
        .routes(routes!(find_release_by_id))
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
    service.find_one(Filter::Id(id)).await.map_into()
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
        .map_into()
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
//     service.random(query.count).await.map_into()
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
