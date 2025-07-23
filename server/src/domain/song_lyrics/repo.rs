use super::model::{NewSongLyrics, SongLyrics};
use crate::domain::repository::{Connection, Transaction};

/// Filter for finding a single song lyrics record
#[derive(Clone, Debug)]
pub enum FindOneFilter {
    /// Find by lyrics ID
    Id { id: i32 },
    /// Find by song ID and language ID combination
    SongAndLang { song_id: i32, language_id: i32 },
}

/// Filter for finding multiple song lyrics records
#[derive(Clone, Debug)]
pub enum FindManyFilter {
    /// Find all lyrics for a specific song
    Song { song_id: i32 },
    /// Find all lyrics in a specific language
    Language { language_id: i32 },
    /// Find lyrics for multiple songs
    Songs { song_ids: Vec<i32> },
}

/// Repository trait for song lyrics operations
pub trait Repo: Connection {
    /// Find a single song lyrics record by filter
    async fn find_one(
        &self,
        filter: FindOneFilter,
    ) -> Result<Option<SongLyrics>, Self::Error>;

    /// Find multiple song lyrics records by filter
    async fn find_many(
        &self,
        filter: FindManyFilter,
    ) -> Result<Vec<SongLyrics>, Self::Error>;
}

/// Transaction repository trait for song lyrics operations
pub trait TxRepo: Repo + Transaction
where
    Self::apply_update(..): Send,
{
    /// Create new song lyrics
    async fn create(&self, lyrics: &NewSongLyrics) -> Result<i32, Self::Error>;

    /// Create history record for song lyrics
    async fn create_history(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, Self::Error>;

    /// Apply correction update to song lyrics
    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error>;
}
