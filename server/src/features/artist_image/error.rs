use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use snafu::Snafu;

use crate::adapter::inbound::rest::api_response::Error as ApiError;
use crate::application::error::EntityNotFound;
use crate::domain::image;
use crate::infra;

#[derive(Debug, Snafu)]
pub enum Error {
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Service { source: image::Error },
    #[snafu(transparent)]
    ArtistNotFound { source: EntityNotFound },
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::Infra { source } => source.into_response(),
            Self::Service { source } => source.into_response(),
            Self::ArtistNotFound { source } => {
                ApiError::from_err_and_code(source, StatusCode::BAD_REQUEST)
                    .into_response()
            }
        }
    }
}

impl<A> From<A> for Error
where
    A: Into<infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
}
