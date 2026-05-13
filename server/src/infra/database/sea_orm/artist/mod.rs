use super::SeaOrmTxRepo;
use crate::domain::artist::NewArtist;
use crate::features::artist::TxRepo;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(crate) mod impls;

impl TxRepo for SeaOrmTxRepo {
    async fn create(&self, data: &NewArtist) -> Result<i32, DatabaseError> {
        let artist = impls::create_artist(data, self.conn())
            .await
            .with_operation("create artist")?;

        Ok(artist.id)
    }

    async fn create_history(
        &self,
        data: &NewArtist,
    ) -> Result<i32, DatabaseError> {
        let history = impls::create_artist_history(data, self.conn())
            .await
            .with_operation("create artist history")?;

        Ok(history.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), DatabaseError> {
        impls::apply_update(correction, self.conn())
            .await
            .with_operation("apply artist correction")
    }
}
