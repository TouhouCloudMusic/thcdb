use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::dto::artist::ArtistCorrection;
use crate::service::artist::ArtistService;
use crate::state::AppState;
use crate::{api_response, repo, service};

type Error = service::artist::Error;

impl IntoResponse for service::artist::Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Repo(err) => err.into_response(),
        }
    }
}

impl IntoResponse for repo::artist::Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::EntityCorrection(err) => err.into_response(),
            Self::Validation(err) => err.into_response(),
            Self::General(err) => err.into_response(),
        }
    }
}

impl IntoResponse for repo::artist::ValidationError {
    fn into_response(self) -> axum::response::Response {
        api_response::err(StatusCode::BAD_REQUEST, self.to_string())
            .into_response()
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(create_artist))
}

#[derive(ToSchema, Deserialize)]
struct CreateArtistInput {
    #[serde(flatten)]
    pub data: ArtistCorrection,
}

#[utoipa::path(
	post,
	path = "/artist",
	request_body = CreateArtistInput,
	responses(
		(status = 200, description = "Artist create successfully"),
		(status = 500, description = "Artist create failed"),
	),
)]
async fn create_artist(
    State(service): State<ArtistService>,
    Json(input): Json<CreateArtistInput>,
) -> Result<(), Error> {
    service.create(input.data).await?;

    Ok(())
}
