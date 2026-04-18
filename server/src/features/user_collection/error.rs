use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use sea_orm::DbErr;

use crate::infra::error::Error as InfraError;
use crate::shared::http::api_response::Error as ApiError;

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

    const fn status_code(self) -> StatusCode {
        match self {
            Self::RequestedUser | Self::Collection | Self::CollectionItem => {
                StatusCode::NOT_FOUND
            }
            Self::ReferencedEntity => StatusCode::BAD_REQUEST,
        }
    }
}

#[derive(Debug)]
pub(super) enum Error {
    Infra(InfraError),
    NotFound(NotFound),
    CollectionAccessDenied,
    InvalidRequest(String),
}

impl Error {
    pub(super) fn internal(
        err: Box<dyn std::error::Error + Send + Sync>,
    ) -> Self {
        Self::Infra(InfraError::Internal { source: err })
    }
}

impl From<InfraError> for Error {
    fn from(err: InfraError) -> Self {
        Self::Infra(err)
    }
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Infra(err.into())
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::Infra(err) => err.into_response(),
            Self::NotFound(kind) => {
                ApiError::from_err_and_code(kind.message(), kind.status_code())
                    .into_response()
            }
            Self::CollectionAccessDenied => ApiError::from_err_and_code(
                "Collection access denied",
                StatusCode::FORBIDDEN,
            )
            .into_response(),
            Self::InvalidRequest(message) => {
                ApiError::from_err_and_code(message, StatusCode::BAD_REQUEST)
                    .into_response()
            }
        }
    }
}
