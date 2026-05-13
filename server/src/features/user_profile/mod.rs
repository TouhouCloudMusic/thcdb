mod http;
mod service;

use axum::response::IntoResponse;
pub use http::{DataUserProfile, load_profile, router};
pub use service::Service;

use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum Error {
    #[display("User not found")]
    NotFound,
    #[display("cannot follow yourself")]
    CannotFollowSelf,
    #[display("{source}")]
    Database {
        #[error(source)]
        source: DatabaseError,
    },
}

impl From<DatabaseError> for Error {
    fn from(source: DatabaseError) -> Self {
        Self::Database { source }
    }
}

impl From<Error> for AppError {
    #[track_caller]
    fn from(err: Error) -> Self {
        match err {
            Error::NotFound => AppError::not_found(err.to_string()),
            Error::CannotFollowSelf => AppError::bad_request(err.to_string()),
            Error::Database { source } => source.into(),
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FollowResult {
    Followed,
    AlreadyFollowing,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnfollowResult {
    Unfollowed,
    NotFollowing,
}
