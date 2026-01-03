mod http;
mod model;
mod repo;

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
pub use http::router;
pub use model::InvalidScore;

use crate::adapter::inbound::rest::api_response::Error as ApiError;

#[derive(Debug)]
pub enum Error {
    InvalidScore(InvalidScore),
    EntityNotFound(&'static str, i32),
    TagNotFound(i32),
    Db(sea_orm::DbErr),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidScore(e) => write!(f, "{e}"),
            Self::EntityNotFound(entity, id) => {
                write!(f, "{entity} with id {id} not found")
            }
            Self::TagNotFound(id) => write!(f, "Tag with id {id} not found"),
            Self::Db(e) => write!(f, "{e}"),
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let status = match &self {
            Self::InvalidScore(_) => StatusCode::BAD_REQUEST,
            Self::EntityNotFound(_, _) | Self::TagNotFound(_) => {
                StatusCode::NOT_FOUND
            }
            Self::Db(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        ApiError::new((self.to_string(), status)).into_response()
    }
}

impl From<sea_orm::DbErr> for Error {
    fn from(e: sea_orm::DbErr) -> Self {
        Self::Db(e)
    }
}

impl From<InvalidScore> for Error {
    fn from(e: InvalidScore) -> Self {
        Self::InvalidScore(e)
    }
}
