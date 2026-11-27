use entity::song_lyrics_history;
use sea_orm::{ConnectionTrait, DbErr, EntityTrait};
use serde_json::{Value, json};

pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    infra_db::trace("correction.snapshot_song_lyrics", async {
        let history = song_lyrics_history::Entity::find_by_id(history_id)
            .one(db)
            .await?
            .ok_or_else(|| {
                DbErr::Custom("Song lyrics history not found".to_string())
            })?;

        Ok(json!({
            "language_id": history.language_id,
            "content": history.content,
            "is_main": history.is_main,
        }))
    })
    .await
}
