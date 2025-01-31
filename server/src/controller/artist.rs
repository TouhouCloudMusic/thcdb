use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use utoipa::{IntoResponses, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{
    ErrResponseDef, IntoApiResponse, Message, StatusCodeExt,
};
use crate::dto::artist::ArtistCorrection;
use crate::error::{AsErrorCode, ErrorCode, RepositoryError};
use crate::service::artist::ArtistService;
use crate::state::AppState;
use crate::{repo, service};

type Error = service::artist::Error;

impl StatusCodeExt for repo::artist::Error {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::Validation(_) => StatusCode::BAD_REQUEST,
            Self::General(e) => e.as_status_code(),
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [StatusCode::BAD_REQUEST]
            .into_iter()
            .chain(RepositoryError::all_status_codes())
    }
}

impl AsErrorCode for repo::artist::Error {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::Validation(e) => match e {
                repo::artist::ValidationError::UnknownTypeArtistOwnedMember => {
                    ErrorCode::UnknownTypeArtistOwnedMember
                }
            },
            Self::General(e) => e.as_error_code(),
        }
    }
}

impl StatusCodeExt for service::artist::Error {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::Repo(error) => error.as_status_code(),
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        repo::artist::Error::all_status_codes()
    }
}

impl AsErrorCode for service::artist::Error {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::Repo(error) => error.as_error_code(),
        }
    }
}

impl IntoResponse for service::artist::Error {
    fn into_response(self) -> axum::response::Response {
        self.into_api_response()
    }
}

impl IntoResponses for service::artist::Error {
    fn responses() -> std::collections::BTreeMap<
        String,
        utoipa::openapi::RefOr<utoipa::openapi::response::Response>,
    > {
        Self::build_err_responses().into()
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(create_artist))
}

#[derive(ToSchema, Deserialize)]
struct NewArtist {
    #[serde(flatten)]
    #[schema(inline)]
    pub data: ArtistCorrection,
}

#[utoipa::path(
	post,
	path = "/artist",
	request_body = NewArtist,
	responses(
		(status = 200, body = Message),
        (status = 401),
		Error
	),
)]
async fn create_artist(
    State(service): State<ArtistService>,
    Json(input): Json<NewArtist>,
) -> Result<Message, Error> {
    service.create(input.data).await?;

    Ok(Message::ok())
}
