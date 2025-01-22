use std::fmt::Debug;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use error_set::error_set;

use crate::api_response;

error_set! {
    GeneralRepositoryError = {
        #[display("Database error")]
        Database(sea_orm::DbErr),
        #[display("Tokio error")]
        TokioError(tokio::task::JoinError),

        #[display("Entity {entity_name} not found")]
        EntityNotFound {
            entity_name: &'static str
        },
        #[display("Unexpected error: related entity {entity_name} not found")]
        RelatedEntityNotFound {
            entity_name: &'static str
        },
        #[display("Invalid field: {field}, expected: {expected}, accepted: {accepted}.")]
        InvalidField {
            field: String,
            expected: String,
            accepted: String
        },
    };


}

pub trait AsStatusCode {
    fn as_status_code(&self) -> StatusCode;
}

impl<T> AsStatusCode for Option<T>
where
    T: AsStatusCode,
{
    fn as_status_code(&self) -> StatusCode {
        self.as_ref().map_or(
            StatusCode::INTERNAL_SERVER_ERROR,
            AsStatusCode::as_status_code,
        )
    }
}

impl AsStatusCode for StatusCode {
    fn as_status_code(&self) -> StatusCode {
        *self
    }
}

impl AsStatusCode for GeneralRepositoryError {
    /// Status code:
    ///   - 400
    ///   - 404
    ///   - 500
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::Database(_)
            | Self::RelatedEntityNotFound { .. }
            | Self::TokioError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::InvalidField { .. } => StatusCode::BAD_REQUEST,
            Self::EntityNotFound { .. } => StatusCode::NOT_FOUND,
        }
    }
}

impl IntoResponse for GeneralRepositoryError {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Database(ref db_err) => {
                tracing::error!("Database error: {}", db_err);
            }
            Self::TokioError(ref join_err) => {
                tracing::error!("Tokio error: {}", join_err);
            }
            _ => (),
        }

        api_response::err(self.as_status_code(), self.to_string())
            .into_response()
    }
}

pub trait LogErr {
    fn log_err(self) -> Self;
}

impl<T, E> LogErr for Result<T, E>
where
    E: Debug,
{
    fn log_err(self) -> Self {
        if let Err(ref e) = self {
            tracing::error!("{:#?}", e);
        }
        self
    }
}
