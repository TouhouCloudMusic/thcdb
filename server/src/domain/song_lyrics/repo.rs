use super::model::NewSongLyrics;
/// Transaction repository trait for song lyrics operations
pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    /// Create new song lyrics
    async fn create(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    /// Create history record for song lyrics
    async fn create_history(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    /// Apply correction update to song lyrics
    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
