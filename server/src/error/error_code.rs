use serde_repr::Serialize_repr;

use super::RepositoryError;

pub trait AsErrorCode {
    fn as_error_code(&self) -> crate::error::ErrorCode;
}

#[allow(clippy::inconsistent_digit_grouping)]
#[derive(Serialize_repr)]
#[repr(u32)]
pub enum ErrorCode {
    InvalidField = 400_00,
    IncorrectCorrectionType = 400_01,
    Unauthorized = 401_00,
    AuthenticationFailed = 401_01,
    EntityNotFound = 404_00,
    UnknownError = 500_00,
    TokioError = 500_01,
    DatabaseError = 500_02,
    RedisError = 500_03,
    UnExpRelatedEntityNotFound = 500_04,
    IoError = 500_05,
    // User
    InvalidUserName = 1_400_00,
    InvalidPassword = 1_400_01,
    PasswordTooWeak = 1_400_02,
    AlreadySignedIn = 1_409_00,
    UsernameAlreadyInUse = 1_409_01,
    SessionMiddlewareError = 1_500_00,
    ParsePasswordFailed = 1_500_01,
    HashPasswordFailed = 1_500_02,
    // Artist
    UnknownTypeArtistOwnedMember = 2_400_00,
    // Image
    InvalidImageType = 3_400_00,
}

impl AsErrorCode for RepositoryError {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::Database(_) => ErrorCode::DatabaseError,
            Self::Tokio(_) => ErrorCode::TokioError,
            Self::EntityNotFound { .. } => ErrorCode::EntityNotFound,
            Self::UnexpRelatedEntityNotFound { .. } => {
                ErrorCode::UnExpRelatedEntityNotFound
            }
            Self::InvalidField { .. } => ErrorCode::InvalidField,
            Self::IncorrectCorrectionType { .. } => {
                ErrorCode::IncorrectCorrectionType
            }
            Self::Unauthorized => ErrorCode::Unauthorized,
        }
    }
}
