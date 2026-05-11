use axum::response::IntoResponse;
use sea_orm::DbErr;

use crate::domain::image::{
    ValidationError, {self},
};
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, snafu::Snafu)]
pub enum Error {
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    ImageService { source: image::Error },
    #[snafu(transparent)]
    Validate { source: ValidationError },
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err)
                .with_operation("user image database operation"),
        }
    }
}

impl<E> From<E> for Error
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database { source } => source.into(),
            Error::Infra { source } => source.into(),
            Error::ImageService { source } => source.into(),
            Error::Validate { source } => source.into(),
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}
