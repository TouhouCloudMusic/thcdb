use comment_service::ErrorKind;

use crate::shared::http::api_response::AppError;

impl From<comment_service::Error> for AppError {
    fn from(err: comment_service::Error) -> Self {
        match err.kind() {
            ErrorKind::InvalidRequest => Self::bad_request(err.to_string()),
            ErrorKind::NotFound => Self::not_found(err.to_string()),
            ErrorKind::PermissionDenied => Self::forbidden(err.to_string()),
            ErrorKind::Internal => Self::internal(err),
        }
    }
}
