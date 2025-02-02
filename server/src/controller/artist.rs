use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use utoipa::{IntoParams, IntoResponses, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{
    Data, ErrResponseDef, IntoApiResponse, Message, StatusCodeExt,
};
use crate::dto::artist::{ArtistCorrection, ArtistResponse};
use crate::error::{AsErrorCode, ErrorCode, RepositoryError};
use crate::middleware::is_signed_in;
use crate::service::artist::ArtistService;
use crate::state::AppState;
use crate::utils::MapInto;
use crate::{repo, service};

type Error = service::artist::Error;

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create))
        .routes(routes!(create_update_corretion))
        .routes(routes!(update_update_correction))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_by_id))
        .routes(routes!(find_by_keyword))
}

#[utoipa::path(
	get,
    tag = TAG,
	path = "/artist/{id}",
	responses(
		(status = 200, body = Data<ArtistResponse>),
		Error
	),
)]
async fn find_by_id(
    State(service): State<ArtistService>,
    Path(id): Path<i32>,
) -> Result<Data<ArtistResponse>, Error> {
    service.find_by_id(id).await.map_into()
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
		(status = 200, body = Data<Vec<ArtistResponse>>),
		Error
	),
)]
async fn find_by_keyword(
    State(service): State<ArtistService>,
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<ArtistResponse>>, Error> {
    service.find_by_keyword(&query.keyword).await.map_into()
}

#[derive(ToSchema, Deserialize)]
struct NewArtist {
    #[serde(flatten)]
    #[schema(inline)]
    pub data: ArtistCorrection,
}

#[utoipa::path(
	post,
    tag = TAG,
	path = "/artist",
	request_body = NewArtist,
	responses(
		(status = 200, body = Message),
        (status = 401),
		Error
	),
)]
async fn create(
    State(service): State<ArtistService>,
    Json(input): Json<NewArtist>,
) -> Result<Message, Error> {
    service.create(input.data).await?;

    Ok(Message::ok())
}

#[utoipa::path(
	post,
    tag = TAG,
	path = "/artist/{id}",
	request_body = NewArtist,
	responses(
		(status = 200, body = Message),
        (status = 401),
		Error
	),
)]
async fn create_update_corretion(
    State(service): State<ArtistService>,
    Path(id): Path<i32>,
    Json(input): Json<NewArtist>,
) -> Result<Message, Error> {
    service.create_update_correction(id, input.data).await?;

    Ok(Message::ok())
}

#[utoipa::path(
	post,
    tag = TAG,
	path = "/artist/correction/{id}",
	request_body = NewArtist,
	responses(
		(status = 200, body = Message),
        (status = 401),
		Error
	),
)]
async fn update_update_correction(
    State(service): State<ArtistService>,
    Path(id): Path<i32>,
    Json(input): Json<NewArtist>,
) -> Result<Message, Error> {
    service.update_update_correction(id, input.data).await?;

    Ok(Message::ok())
}

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
