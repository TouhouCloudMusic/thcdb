use std::panic::Location;

use derive_more::Display;
use entity::enums::EntityType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::Language;

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

#[derive(Debug, Display, derive_more::Error)]
#[display("Validation error: {kind}")]
pub struct ValidationError {
    pub kind: ValidationErrorKind,
    location: &'static Location<'static>,
}

impl From<ValidationErrorKind> for ValidationError {
    #[track_caller]
    fn from(kind: ValidationErrorKind) -> Self {
        Self {
            kind,
            location: Location::caller(),
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
