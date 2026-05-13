use crate::features::artist::model::NewArtist;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::SeaOrmTxRepo;
use crate::infra::database::sea_orm::artist::impls as artist_impls;

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewArtist) -> Result<i32, DatabaseError>;

    async fn create_history(
        &self,
        data: &NewArtist,
    ) -> Result<i32, DatabaseError>;

    async fn apply_update(
        &self,
        data: entity::correction::Model,
    ) -> Result<(), DatabaseError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewArtist,
) -> Result<i32, DatabaseError> {
    artist_impls::create_artist(data, repo.conn())
        .await
        .map(|artist| artist.id)
        .with_operation("create artist")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewArtist,
) -> Result<i32, DatabaseError> {
    artist_impls::create_artist_history(data, repo.conn())
        .await
        .map(|artist| artist.id)
        .with_operation("create artist history")
}
