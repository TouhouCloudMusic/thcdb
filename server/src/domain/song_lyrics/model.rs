use std::backtrace::Backtrace;

use axum::http::StatusCode;
use derive_more::Display;
use entity::enums::EntityType;
use macros::ApiError;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::Language;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongLyrics {
    pub id: i32,
    pub song_id: i32,
    pub content: String,
    pub is_main: bool,
    pub language: Language,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct NewSongLyrics {
    pub song_id: i32,
    pub language_id: i32,
    pub content: String,
    pub is_main: bool,
}

#[derive(Debug, thiserror::Error, ApiError)]
#[error("Validation error: {kind}")]
#[api_error(
    status_code = StatusCode::BAD_REQUEST
)]
pub struct ValidationError {
    pub kind: ValidationErrorKind,
    pub backtrace: Backtrace,
}

impl From<ValidationErrorKind> for ValidationError {
    fn from(kind: ValidationErrorKind) -> Self {
        Self {
            kind,
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, Display)]
pub enum ValidationErrorKind {
    #[display("Content is empty")]
    EmptyContent,
    #[display("Invalid Song Id: {_0}")]
    InvalidSongId(i32),
    #[display("Invalid Language Id: {_0}")]
    InvalidLanguageId(i32),
}

use ValidationErrorKind::*;

impl NewSongLyrics {
    pub fn validate(&self) -> Result<(), ValidationError> {
        if self.content.trim().is_empty() {
            return Err(EmptyContent.into());
        }

        if self.song_id <= 0 {
            return Err(InvalidSongId(self.song_id).into());
        }

        if self.language_id <= 0 {
            return Err(InvalidLanguageId(self.language_id).into());
        }

        Ok(())
    }
}

impl CorrectionEntity for NewSongLyrics {
    fn entity_type() -> EntityType {
        EntityType::SongLyrics
    }
}
