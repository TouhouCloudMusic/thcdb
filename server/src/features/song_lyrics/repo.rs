use sea_orm::DbErr;

use crate::features::song_lyrics::model::NewSongLyrics;
use crate::infra::database::sea_orm::{
    SeaOrmTxRepo, song_lyrics as lyrics_impls,
};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewSongLyrics,
) -> Result<i32, DbErr> {
    lyrics_impls::create_lyrics_impl(data, repo.conn()).await
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewSongLyrics,
) -> Result<i32, DbErr> {
    lyrics_impls::create_history_impl(data, repo.conn()).await
}
