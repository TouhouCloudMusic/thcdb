use entity::artist;
use error_set::error_set;
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::artist::ArtistCorrection;
use crate::error::GeneralRepositoryError;
use crate::repo;

#[derive(Clone)]
pub struct ArtistService {
    db: DatabaseConnection,
}

error_set! {
    Error = {
        Repo(repo::artist::Error)
    };
}

impl From<sea_orm::DbErr> for Error {
    fn from(err: sea_orm::DbErr) -> Self {
        Self::Repo(repo::artist::Error::General(
            GeneralRepositoryError::Database(err),
        ))
    }
}

impl ArtistService {
    pub const fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        data: ArtistCorrection,
    ) -> Result<artist::Model, Error> {
        let transaction = self.db.begin().await?;

        let new_artist = repo::artist::create(data, &transaction).await?;

        transaction.commit().await?;
        Ok(new_artist)
    }

    pub async fn create_update_correction(
        &self,
        artist_id: i32,
        data: ArtistCorrection,
    ) -> Result<(), Error> {
        let transaction = self.db.begin().await?;

        repo::artist::create_update_correction(artist_id, data, &transaction)
            .await?;

        transaction.commit().await?;
        Ok(())
    }

    pub async fn update_update_correction(
        &self,
        correction_id: i32,
        data: ArtistCorrection,
    ) -> Result<(), Error> {
        let transaction = self.db.begin().await?;

        repo::artist::update_update_correction(
            correction_id,
            data,
            &transaction,
        )
        .await?;

        transaction.commit().await?;

        Ok(())
    }
}
