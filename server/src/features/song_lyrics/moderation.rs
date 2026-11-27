use infra_db::DatabaseTransaction;
use infra_db::error::{DatabaseError, DatabaseResultExt};

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub(crate) enum ApplyEditError {
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display(
        "Song lyrics #{lyrics_id} and history #{history_id} have different song or language IDs"
    )]
    IdentityMismatch { lyrics_id: i32, history_id: i32 },
}

pub(crate) async fn apply_edit(
    tx: &DatabaseTransaction,
    lyrics_id: i32,
    history_id: i32,
) -> Result<(), ApplyEditError> {
    const OPERATION: &str = "song_lyrics.apply_update";
    infra_db::trace(OPERATION, async {
        let (live, history) =
            song_lyrics_repo::load_edit(tx, lyrics_id, history_id)
                .await
                .db_context(OPERATION)?;

        if (live.song_id, live.language_id)
            != (history.song_id, history.language_id)
        {
            return Err(ApplyEditError::IdentityMismatch {
                lyrics_id: live.id,
                history_id: history.id,
            });
        }

        song_lyrics_repo::update(tx, live, history.content, history.is_main)
            .await
            .db_context(OPERATION)?;
        Ok(())
    })
    .await
}
