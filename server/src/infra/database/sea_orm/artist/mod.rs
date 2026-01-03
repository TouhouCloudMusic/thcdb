use snafu::ResultExt;

use super::SeaOrmTxRepo;
use crate::domain::artist::{NewArtist, TxRepo};

pub(crate) mod impls;

impl TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        data: &NewArtist,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        Ok(impls::create_artist(data, self.conn()).await?.id)
    }

    async fn create_history(
        &self,
        data: &NewArtist,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        Ok(impls::create_artist_history(data, self.conn()).await?.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        impls::apply_update(correction, self.conn()).await.boxed()?;
        Ok(())
    }
}
