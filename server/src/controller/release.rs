use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::IntoResponse;
use macros::{use_service, use_session};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, IntoApiResponse, Message, StatusCodeExt};
use crate::dto::release::{ReleaseCorrection, ReleaseResponse};
use crate::error::{AsErrorCode, ErrorCode, RepositoryError};
use crate::middleware::is_signed_in;
use crate::service::release::Service;
use crate::state::AppState;
use crate::utils::MapInto;
use crate::{repo, service};

type Error = service::release::Error;

const TAG: &str = "Release";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create))
        .routes(routes!(update))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_by_keyword))
        .routes(routes!(find_by_id))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/{id}",
    responses(
		(status = 200, body = Data<ReleaseResponse>),
		Error,
    ),
)]
async fn find_by_id(
    State(service): State<Service>,
    Path(id): Path<i32>,
) -> Result<Data<ReleaseResponse>, Error> {
    service.find_by_id(id).await.map_into()
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
		(status = 200, body = Data<Vec<ReleaseResponse>>),
		Error,
    ),
)]
async fn find_by_keyword(
    State(service): State<Service>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<ReleaseResponse>>, Error> {
    service.find_by_keyword(query.keyword).await.map_into()
}

#[derive(IntoParams)]
struct RandomReleaseQuery {
    count: u64,
}

// TODO: set count limit, fix return type
#[utoipa::path(
    get,
    path = "/release",
    params(RandomReleaseQuery),
    responses(
		(status = 200),
		Error
    ),
)]
async fn random(
    State(service): State<Service>,
    Query(query): Query<RandomReleaseQuery>,
) -> Result<Data<Vec<entity::release::Model>>, Error> {
    service.random(query.count).await.map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release",
    request_body = ReleaseCorrection,
    responses(
		(status = 200, body = Message),
        (status = 401),
		Error
    ),
)]
#[use_session]
#[use_service(release)]
async fn create(Json(data): Json<ReleaseCorrection>) -> Result<Message, Error> {
    let user_id = session.user.unwrap().id;
    release_service.create(data, user_id).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release/{id}",
    request_body = ReleaseCorrection,
    responses(
		(status = 200, body = Message),
        (status = 401),
		Error
    ),
)]
#[use_session]
#[use_service(release)]
async fn update(
    Path(id): Path<i32>,
    Json(data): Json<ReleaseCorrection>,
) -> Result<Message, Error> {
    release_service
        .create_or_update_correction()
        .release_id(id)
        .release_data(data)
        .user_id(session.user.unwrap().id)
        .call()
        .await?;

    Ok(Message::ok())
}

impl StatusCodeExt for repo::release::Error {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::General(err) => err.as_status_code(),
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        RepositoryError::all_status_codes()
    }
}

impl AsErrorCode for repo::release::Error {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::General(err) => err.as_error_code(),
        }
    }
}

impl StatusCodeExt for service::release::Error {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::Repo(err) => err.as_status_code(),
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        RepositoryError::all_status_codes()
    }
}

impl AsErrorCode for service::release::Error {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::Repo(err) => err.as_error_code(),
        }
    }
}

impl IntoResponse for service::release::Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Repo(err) => err.into_api_response(),
        }
    }
}
