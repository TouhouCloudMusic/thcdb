use macros::{ApiError, IntoErrorSchema};

use crate::infra;

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum CreateError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validation {
        source: crate::domain::song::ValidationError,
    },
}

impl<E> From<E> for CreateError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validation {
        source: crate::domain::song::ValidationError,
    },
}

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;

    use super::{CreateError, UpsertCorrectionError};
    use crate::domain::song::ValidationErrorKind;
    use crate::shared::http::api_response::ApiError;

    #[test]
    fn create_validation_returns_bad_request() {
        let err = CreateError::Validation {
            source: ValidationErrorKind::SelfRelation.into(),
        };

        assert_eq!(err.as_status_code(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn upsert_validation_returns_bad_request() {
        let err = UpsertCorrectionError::Validation {
            source: ValidationErrorKind::SelfRelation.into(),
        };

        assert_eq!(err.as_status_code(), StatusCode::BAD_REQUEST);
    }
}
