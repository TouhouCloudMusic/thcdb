use axum::response::IntoResponse;
use snafu::Snafu;

use crate::application::error::EntityNotFound;
use crate::domain::image;
use crate::infra;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, Snafu)]
pub enum Error {
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    Service { source: image::Error },
    #[snafu(transparent)]
    ReleaseNotFound { source: EntityNotFound },
}

impl<T> From<T> for Error
where
    T: Into<infra::Error>,
{
    default fn from(value: T) -> Self {
        Self::Infra {
            source: value.into(),
        }
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database { source } => source.into(),
            Error::Infra { source } => source.into(),
            Error::Service { source } => source.into(),
            Error::ReleaseNotFound { source } => {
                AppError::bad_request(source.to_string())
            }
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}
