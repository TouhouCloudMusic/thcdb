use entity::sea_orm_active_enums::EntityType;
use entity::{artist, correction};
use error_set::error_set;
use macros::{ApiError, IntoErrorSchema};
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::artist::{ArtistCorrection, ArtistResponse};
use crate::repo;

super::def_service!();

error_set! {
    #[disable(From)]
    #[derive(IntoErrorSchema, ApiError)]
    Error = {
        #[api_error(
            status_code(self),
            error_code(self),
        )]
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
        user_id: i32,
        data: ArtistCorrection,
    ) -> Result<artist::Model, Error> {
        let transaction = self.db.begin().await?;

        let new_artist =
            repo::artist::create(data, user_id, &transaction).await?;

        transaction.commit().await?;
        Ok(new_artist)
    }

    pub async fn create_or_update_correction(
        &self,
        artist_id: i32,
        user_id: i32,
        data: ArtistCorrection,
    ) -> Result<(), Error> {
        super::correction::create_or_update_correction()
            .entity_id(artist_id)
            .entity_type(EntityType::Artist)
            .user_id(user_id)
            .closure_args(data)
            .on_create(|_, data| {
                create_correction(artist_id, user_id, data, &self.db)
            })
            .on_update(|correction, data| {
                update_correction(user_id, correction, data, &self.db)
            })
            .db(&self.db)
            .call()
            .await
    }
}

async fn create_correction(
    artist_id: i32,
    user_id: i32,
    data: ArtistCorrection,
    db: &DatabaseConnection,
) -> Result<(), Error> {
    let transaction = db.begin().await?;

    repo::artist::create_correction(artist_id, user_id, data, &transaction)
        .await?;

    transaction.commit().await?;
    Ok(())
}

async fn update_correction(
    user_id: i32,
    correction: correction::Model,
    data: ArtistCorrection,
    db: &DatabaseConnection,
) -> Result<(), Error> {
    let transaction = db.begin().await?;

    repo::artist::update_correction(user_id, correction, data, &transaction)
        .await?;

    transaction.commit().await?;

    Ok(())
}
