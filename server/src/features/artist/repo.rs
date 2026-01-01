use sea_orm::DbErr;

use crate::features::artist::model::NewArtist;
use crate::infra::database::sea_orm::artist::impls as artist_impls;
use crate::infra::database::sea_orm::SeaOrmTxRepo;

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
    Ok(artist_impls::create_artist_history(data, repo.conn()).await?.id)
}
