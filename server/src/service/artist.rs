use entity::artist;
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::artist::GeneralArtistDto;
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
        data: GeneralArtistDto,
    ) -> Result<artist::Model, repo::artist::Error> {
        let transaction = self.db.begin().await?;

        let new_artist = repo::artist::create(data, &transaction).await?;
        transaction.commit().await?;
        Ok(new_artist)
    }
}
