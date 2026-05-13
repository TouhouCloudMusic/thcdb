use crate::features::song::model::NewSong;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{
    ApplyCorrectionError, SeaOrmTxRepo, song as song_impls,
};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewSong) -> Result<i32, DatabaseError>;

    async fn create_history(
        &self,
        data: &NewSong,
    ) -> Result<i32, DatabaseError>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), ApplyCorrectionError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewSong,
) -> Result<i32, DatabaseError> {
    song_impls::create_song_and_relations(data, repo.conn())
        .await
        .map(|song| song.id)
        .db_operation("create song")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewSong,
) -> Result<i32, DatabaseError> {
    song_impls::create_song_history_and_relations(data, repo.conn())
        .await
        .map(|song| song.id)
        .db_operation("create song history")
}
