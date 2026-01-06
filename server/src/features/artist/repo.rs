use sea_orm::DbErr;

use crate::features::artist::model::NewArtist;
use crate::infra::database::sea_orm::SeaOrmTxRepo;
use crate::infra::database::sea_orm::artist::impls as artist_impls;

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &NewArtist,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &NewArtist,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        data: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewArtist,
) -> Result<i32, DbErr> {
    Ok(artist_impls::create_artist(data, repo.conn()).await?.id)
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewArtist,
) -> Result<i32, DbErr> {
    Ok(artist_impls::create_artist_history(data, repo.conn())
        .await?
        .id)
}
