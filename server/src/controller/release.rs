use axum::extract::State;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::dto::correction::Metadata;
use crate::dto::release::GeneralRelease;
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
    OpenApiRouter::new().routes(routes!(create_release))
}

#[derive(ToSchema, Deserialize)]
struct CreateReleaseInput {
    #[serde(flatten)]
    pub data: GeneralRelease,
    pub correction_data: Metadata,
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
