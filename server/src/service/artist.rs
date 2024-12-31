use entity::artist;
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::artist::ArtistCorrection;
use crate::repo;
pub struct ArtistService {
    db: DatabaseConnection,
}

impl ArtistService {
    pub const fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        data: ArtistCorrection,
    ) -> Result<artist::Model, repo::artist::Error> {
        let transaction = self.db.begin().await?;

        let new_artist = repo::artist::create(data, &transaction).await?;
        transaction.commit().await?;
        Ok(new_artist)
    }
}
