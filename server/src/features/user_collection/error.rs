use axum::response::IntoResponse;

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
    CannotFollowOwnCollection,
    InvalidRequest(String),
}

impl From<infra_db::error::DatabaseError> for Error {
    fn from(source: infra_db::error::DatabaseError) -> Self {
        Self::Database(source.into())
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Database(err) => err.into_response(),
            Error::Internal(err) => err.into_response(),
            Error::NotFound(kind) => kind.into_app_error().into_response(),
            Error::CollectionAccessDenied => PermissionDenied.into_response(),
            Error::CannotFollowOwnCollection => {
                AppError::bad_request("Cannot follow your own collection")
                    .into_response()
            }
            Error::InvalidRequest(message) => {
                AppError::bad_request(message).into_response()
            }
        }
    }
}
