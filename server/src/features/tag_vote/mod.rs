mod http;

pub use http::router;

use crate::shared::http::api_response::AppError;

impl From<tag_vote_core::Error> for AppError {
    fn from(err: tag_vote_core::Error) -> Self {
        match err {
            tag_vote_core::Error::NotFound(source) => source.into(),
            tag_vote_core::Error::Database(source) => source.into(),
        }
    }
}
