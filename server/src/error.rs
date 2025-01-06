use std::fmt::Debug;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use error_set::error_set;

use crate::api_response;

error_set! {
    GeneralRepositoryError = {
        #[display("Database error")]
        Database(sea_orm::DbErr),
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

    EntityCorrectionError = {
        #[display("Incorrect correction entity type")]
        IncorrectCorrectionEntityType,
        #[display("The correction to be applied dosen't exist")]
        CorretionNotFound,
    };

    SongServiceError = SongRepositoryError;

    SongRepositoryError = GeneralRepositoryError || EntityCorrectionError;
}

pub trait AsStatusCode {
    fn as_status_code(&self) -> StatusCode;
}

impl AsStatusCode for GeneralRepositoryError {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::Database(_) | Self::RelatedEntityNotFound { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::InvalidField { .. } => StatusCode::BAD_REQUEST,
            Self::EntityNotFound { .. } => StatusCode::NOT_FOUND,
        }
    }
}

impl IntoResponse for GeneralRepositoryError {
    fn into_response(self) -> axum::response::Response {
        if let Self::Database(ref db_err) = self {
            tracing::error!("Database error: {}", db_err);
        }

        api_response::err(self.as_status_code(), self.to_string())
            .into_response()
    }
}

impl AsStatusCode for EntityCorrectionError {
    fn as_status_code(&self) -> StatusCode {
        match self {
            // TODO: This should not happend
            Self::IncorrectCorrectionEntityType => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::CorretionNotFound => StatusCode::NOT_FOUND,
        }
    }
}

impl IntoResponse for EntityCorrectionError {
    fn into_response(self) -> axum::response::Response {
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
