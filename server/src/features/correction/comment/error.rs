use sea_orm::DbErr;

use crate::infra::database::error::DatabaseError;
use crate::infra::error::Error as InfraError;
use crate::shared::error::PermissionDenied;
use crate::shared::http::api_response::AppError;

#[derive(Debug, Clone, Copy)]
pub(in crate::features::correction) enum NotFound {
    Correction,
    Comment,
}

impl NotFound {
    const fn message(self) -> &'static str {
        match self {
            Self::Correction => "Correction not found",
            Self::Comment => "Comment not found",
        }
    }
}

#[derive(Debug, derive_more::From)]
pub(in crate::features::correction) enum Error {
    #[from]
    Database(DatabaseError),
    #[from]
    Infra(InfraError),
    NotFound(NotFound),
    PermissionDenied,
    InvalidRequest(String),
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Database(
            DatabaseError::new(err)
                .with_operation("correction comment database operation"),
        )
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database(err) => err.into(),
            Error::Infra(err) => err.into(),
            Error::NotFound(kind) => AppError::not_found(kind.message()),
            Error::PermissionDenied => PermissionDenied.into(),
            Error::InvalidRequest(message) => AppError::bad_request(message),
        }
    }
}
