use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::AppError;

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

    fn into_app_error(self) -> AppError {
        match self {
            Self::RequestedUser | Self::Collection | Self::CollectionItem => {
                AppError::not_found(self.message())
            }
            Self::ReferencedEntity => AppError::bad_request(self.message()),
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
        match err {
            Error::Database(err) => err.into(),
            Error::Internal(err) => err.into(),
            Error::NotFound(kind) => kind.into_app_error(),
            Error::CollectionAccessDenied => PermissionDenied.into(),
            Error::InvalidRequest(message) => AppError::bad_request(message),
        }
    }
}
