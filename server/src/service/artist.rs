use entity::artist;
use sea_orm::{DatabaseConnection, DbErr, TransactionTrait};

use crate::dto::artist::NewArtist;
use crate::repository;
pub struct ArtistService {
    db: DatabaseConnection,
}

impl ArtistService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        data: NewArtist,
    ) -> Result<artist::Model, DbErr> {
        let transaction = self.db.begin().await?;

        let new_artist = repository::artist::create(data, &transaction).await?;
        transaction.commit().await?;
        Ok(new_artist)
    }
}
