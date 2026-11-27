use derive_more::Display;
use entity::enums::EntityType;
use serde::Deserialize;
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct NewSongLyrics {
    pub song_id: i32,
    pub language_id: i32,
    pub content: String,
    pub is_main: bool,
}

pub type ValidationError =
    crate::shared::error::ValidationError<ValidationErrorKind>;

#[derive(Debug, Display)]
pub enum ValidationErrorKind {
    #[display("Content is empty")]
    EmptyContent,
    #[display("Invalid Song Id: {_0}")]
    InvalidSongId(i32),
    #[display("Invalid Language Id: {_0}")]
    InvalidLanguageId(i32),
}

impl std::error::Error for ValidationErrorKind {}

use ValidationErrorKind::*;

fn validate_content(content: &str) -> Result<(), ValidationError> {
    if content.trim().is_empty() {
        return Err(EmptyContent.into());
    }
    Ok(())
}

impl NewSongLyrics {
    pub fn validate(&self) -> Result<(), ValidationError> {
        validate_content(&self.content)?;

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

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct EditSongLyrics {
    pub content: String,
    pub is_main: bool,
}

impl EditSongLyrics {
    pub fn validate(&self) -> Result<(), ValidationError> {
        validate_content(&self.content)
    }
}

impl CorrectionEntity for EditSongLyrics {
    fn entity_type() -> EntityType {
        EntityType::SongLyrics
    }
}
