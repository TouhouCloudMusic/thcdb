use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use utoipa::{IntoParams, IntoResponses, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{
    Data, ErrResponseDef, IntoApiResponse, Message, StatusCodeExt,
};
use crate::dto::correction::Metadata;
use crate::dto::release::GeneralRelease;
use crate::error::{AsErrorCode, ErrorCode, RepositoryError};
use crate::service::release::ReleaseService;
use crate::state::AppState;
use crate::utils::MapInto;
use crate::{repo, service};

type Error = service::release::Error;

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

impl IntoResponses for service::release::Error {
    fn responses() -> std::collections::BTreeMap<
        String,
        utoipa::openapi::RefOr<utoipa::openapi::response::Response>,
    > {
        Self::build_err_responses().into()
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create))
        .routes(routes!(find_by_id))
}

#[derive(ToSchema, Deserialize)]
struct CreateReleaseInput {
    #[serde(flatten)]
    pub data: GeneralRelease,
    pub correction_data: Metadata,
}

#[utoipa::path(
    get,
    path = "/release/{id}",
    responses(
		(status = 200, description = "Release found by id"),
		Error,
    ),
)]
async fn find_by_id(
    State(service): State<ReleaseService>,
    Path(id): Path<i32>,
) -> Result<Data<entity::release::Model>, Error> {
    service.find_by_id(id).await.map_into()
}

#[utoipa::path(
    post,
    path = "/release",
    request_body = CreateReleaseInput,
    responses(
		(status = 200, body = Message),
        (status = 401),
		Error
    ),
)]
async fn create(
    State(service): State<ReleaseService>,
    Json(input): Json<CreateReleaseInput>,
) -> Result<Message, Error> {
    service.create(input.data, input.correction_data).await?;

    Ok(Message::ok())
}

#[derive(IntoParams)]
struct RandomReleaseQuery {
    count: u64,
}

#[utoipa::path(
    get,
    path = "/release",
    params(RandomReleaseQuery),
    responses(
		(status = 200, description = "Release found by id"),
		(status = 500, description = "Failed to find release by id"),
    ),
)]
async fn random(
    State(service): State<ReleaseService>,
    Query(query): Query<RandomReleaseQuery>,
) -> Result<Data<Vec<entity::release::Model>>, Error> {
    // TODO: set count limit
    service.random(query.count).await.map_into()
}
