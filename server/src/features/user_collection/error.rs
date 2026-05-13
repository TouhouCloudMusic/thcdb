use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::{AppError, AppErrorKind};

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
    Internal(InternalError),
    NotFound(NotFound),
    CollectionAccessDenied,
    InvalidRequest(String),
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        #[track_caller]
        fn from_not_found(kind: NotFound) -> AppError {
            AppError::new(kind.app_error_kind(), kind.message())
        }

        match err {
            Error::Database(err) => err.into(),
            Error::Internal(err) => err.into(),
            Error::NotFound(kind) => from_not_found(kind),
            Error::CollectionAccessDenied => PermissionDenied.into(),
            Error::InvalidRequest(message) => AppError::bad_request(message),
        }
    }
}
