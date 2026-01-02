use sea_orm::DbErr;

use crate::features::song::model::NewSong;
use crate::infra::database::sea_orm::{SeaOrmTxRepo, song as song_impls};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewSong,
) -> Result<i32, DbErr> {
    Ok(song_impls::create_song_and_relations(data, repo.conn())
        .await?
        .id)
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewSong,
) -> Result<i32, DbErr> {
    Ok(
        song_impls::create_song_history_and_relations(data, repo.conn())
            .await?
            .id,
    )
}
