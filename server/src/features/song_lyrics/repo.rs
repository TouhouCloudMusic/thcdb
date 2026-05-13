use crate::features::song_lyrics::model::NewSongLyrics;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{
    SeaOrmTxRepo, song_lyrics as lyrics_impls,
};

/// Transaction repository trait for song lyrics operations
pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    /// Create new song lyrics
    async fn create(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, DatabaseError>;

    /// Create history record for song lyrics
    async fn create_history(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, DatabaseError>;

    /// Apply correction update to song lyrics
    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), DatabaseError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewSongLyrics,
) -> Result<i32, DatabaseError> {
    lyrics_impls::create_lyrics_impl(data, repo.conn())
        .await
        .db_operation("create song lyrics")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewSongLyrics,
) -> Result<i32, DatabaseError> {
    lyrics_impls::create_history_impl(data, repo.conn())
        .await
        .db_operation("create song lyrics history")
}
