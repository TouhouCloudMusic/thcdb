use axum::extract::State;
use axum::response::IntoResponse;
use axum::Json;
use sea_orm::EntityName;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::dto::correction::Metadata;
use crate::dto::release::GeneralRelease;
use crate::error::GeneralRepositoryError;
use crate::service::release::ReleaseService;
use crate::state::AppState;
use crate::{repo, service};

type Error = service::release::Error;

impl IntoResponse for service::release::Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Repo(err) => err.into_response(),
        }
    }
}

impl IntoResponse for repo::release::Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::General(err) => err.into_response(),
        }
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create_release))
        .routes(routes!(find_by_id))
}

#[derive(ToSchema, Deserialize)]
struct CreateReleaseInput {
    #[serde(flatten)]
    pub data: GeneralRelease,
    pub correction_data: Metadata,
}

#[derive(ToSchema, Deserialize)]
struct FindReleaseByIdInput {
    pub id: i32,
}

#[derive(ToSchema, Deserialize)]
struct RandomReleaseInput {
    pub count: u64,
}

#[utoipa::path(
    post,
    path = "/release",
    request_body = CreateReleaseInput,
    responses(
		(status = 200, description = "Release create successfully"),
		(status = 500, description = "Release create failed"),
    ),
)]
async fn create_release(
    State(service): State<ReleaseService>,
    Json(input): Json<CreateReleaseInput>,
) -> Result<(), Error> {
    service.create(input.data, input.correction_data).await?;
    Ok(())
}

#[utoipa::path(
    post,
    path = "/release",
    request_body = FindReleaseByIdInput,
    responses(
		(status = 200, description = "Release found by id"),
		(status = 500, description = "Failed to find release by id"),
    ),
)]
async fn find_by_id(
    State(service): State<ReleaseService>,
    Json(input): Json<FindReleaseByIdInput>,
) -> Result<Json<entity::release::Model>, Error> {
    Ok(Json(service.find_by_id(input.id).await?.ok_or(
        Error::Repo(repo::release::Error::General(
            GeneralRepositoryError::EntityNotFound {
                entity_name: entity::release::Entity.table_name(),
            },
        )),
    )?))
}

#[utoipa::path(
    post,
    path = "/release",
    request_body = RandomReleaseInput,
    responses(
		(status = 200, description = "Release found by id"),
		(status = 500, description = "Failed to find release by id"),
    ),
)]
async fn random(
    State(service): State<ReleaseService>,
    Json(input): Json<RandomReleaseInput>,
) -> Result<Json<Vec<entity::release::Model>>, Error> {
    Ok(Json(service.random(input.count).await?))
}
