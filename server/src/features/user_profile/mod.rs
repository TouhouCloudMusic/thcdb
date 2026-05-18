mod http;
mod model;
mod repo;
mod service;

use axum::response::IntoResponse;
pub use http::{DataUserProfile, load_profile, router};
pub use model::{UserProfile, UserProfileStats};
pub use service::Service;

use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("User not found")]
    NotFound,
    #[display("cannot follow yourself")]
    CannotFollowSelf,
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::NotFound => {
                AppError::not_found("User not found").into_response()
            }
            Error::CannotFollowSelf => {
                AppError::bad_request("cannot follow yourself").into_response()
            }
            Error::Database(source) => source.into_response(),
        }
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
