use axum::http::StatusCode;
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
    pub language_id: i32,
    pub content: String,
    pub is_main: bool,
    pub language: Option<Language>,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct NewSongLyrics {
    pub song_id: i32,
    pub language_id: i32,
    pub content: String,
    pub is_main: bool,
}

#[derive(Clone, Debug, thiserror::Error, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
    into_response = self
)]
pub enum ValidationError {
    #[error("Content is empty")]
    EmptyContent,
    #[error("Invalid Song Id: {0}")]
    InvalidSongId(i32),
    #[error("Invalid Langauge Id: {0}")]
    InvalidLanguageId(i32),
}

impl NewSongLyrics {
    pub fn validate(&self) -> Result<(), ValidationError> {
        if self.content.trim().is_empty() {
            return Err(ValidationError::EmptyContent);
        }

        if self.song_id <= 0 {
            return Err(ValidationError::InvalidSongId(self.song_id));
        }

        if self.language_id <= 0 {
            return Err(ValidationError::InvalidLanguageId(self.language_id));
        }

        Ok(())
    }
}

impl CorrectionEntity for NewSongLyrics {
    fn entity_type() -> EntityType {
        EntityType::SongLyrics
    }
}
