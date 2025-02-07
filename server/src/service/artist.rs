use entity::artist;
use error_set::error_set;
use macros::IntoErrorSchema;
use sea_orm::TransactionTrait;

use crate::dto::artist::{ArtistCorrection, ArtistResponse};
use crate::repo;

super::def_service!();

error_set! {
    #[disable(From)]
    #[derive(IntoErrorSchema)]
    Error = {
        Repo(repo::artist::Error)
    };
}

impl<T> From<T> for Error
where
    T: Into<repo::artist::Error>,
{
    fn from(value: T) -> Self {
        Self::Repo(value.into())
    }
}

impl Service {
    pub async fn find_by_id(&self, id: i32) -> Result<ArtistResponse, Error> {
        Ok(repo::artist::find_by_id(id, &self.db).await?)
    }

    pub async fn find_by_keyword(
        &self,
        kw: &str,
    ) -> Result<Vec<ArtistResponse>, Error> {
        Ok(repo::artist::find_by_keyword(kw, &self.db).await?)
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
