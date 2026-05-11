use sea_orm::DbErr;

use crate::infra::database::error::DatabaseError;
use crate::infra::error::Error as InfraError;
use crate::shared::error::PermissionDenied;
use crate::shared::http::api_response::{AppError, AppErrorKind};
use crate::shared::types::BoxedError;

#[derive(Debug, Clone, Copy)]
pub(super) enum NotFound {
    RequestedUser,
    Collection,
    ReferencedEntity,
    CollectionItem,
}

impl NotFound {
    const fn message(self) -> &'static str {
        match self {
            Self::RequestedUser => "Requested user not found",
            Self::Collection => "Collection not found",
            Self::ReferencedEntity => "Referenced entity not found",
            Self::CollectionItem => "Collection item not found",
        }
    }

    const fn app_error_kind(self) -> AppErrorKind {
        match self {
            Self::RequestedUser | Self::Collection | Self::CollectionItem => {
                AppErrorKind::NotFound
            }
            Self::ReferencedEntity => AppErrorKind::BadRequest,
        }
    }
}

#[derive(Debug, derive_more::From)]
pub(super) enum Error {
    #[from]
    Database(DatabaseError),
    #[from]
    Infra(InfraError),
    NotFound(NotFound),
    CollectionAccessDenied,
    InvalidRequest(String),
}

impl Error {
    pub(super) fn internal(err: BoxedError) -> Self {
        Self::Infra(InfraError::Internal { source: err })
    }
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Database(
            DatabaseError::new(err)
                .with_operation("user collection database operation"),
        )
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        #[track_caller]
        fn from_not_found(kind: NotFound) -> AppError {
            AppError::new(kind.app_error_kind(), kind.message())
        }

        match err {
            Error::Database(err) => err.into(),
            Error::Infra(err) => err.into(),
            Error::NotFound(kind) => from_not_found(kind),
            Error::CollectionAccessDenied => PermissionDenied.into(),
            Error::InvalidRequest(message) => AppError::bad_request(message),
        }
    }
}
