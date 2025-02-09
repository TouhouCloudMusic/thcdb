use entity::sea_orm_active_enums::EntityType;
use entity::{correction, song};
use sea_orm::{DatabaseConnection, DbErr, TransactionTrait};

use crate::dto::song::{NewSong, SongResponse};
use crate::error::RepositoryError;
use crate::repo;

super::def_service!();

impl Service {
    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<SongResponse, RepositoryError> {
        repo::song::find_by_id(id, &self.db).await
    }

    pub async fn find_by_keyword(
        &self,
        keyword: impl Into<String>,
    ) -> Result<impl IntoIterator<Item = SongResponse>, RepositoryError> {
        repo::song::find_by_keyword(keyword, &self.db).await
    }

    pub async fn create(&self, data: NewSong) -> Result<song::Model, DbErr> {
        let transaction = self.db.begin().await?;

        let result = repo::song::create(data, &transaction).await?;

        transaction.commit().await?;
        Ok(result)
    }

    pub async fn create_or_update_correction(
        &self,
        song_id: i32,
        data: NewSong,
    ) -> Result<(), RepositoryError> {
        super::correction::create_or_update_correction()
            .entity_id(song_id)
            .entity_type(EntityType::Song)
            .user_id(data.metadata.author_id)
            .closure_args(data)
            .on_create(|_, data| create_correction(song_id, data, &self.db))
            .on_update(|correction, data| {
                update_correction(correction, data, &self.db)
            })
            .db(&self.db)
            .call()
            .await
    }
}

async fn create_correction(
    song_id: i32,
    data: NewSong,
    db: &DatabaseConnection,
) -> Result<(), RepositoryError> {
    let transaction = db.begin().await?;

    repo::song::create_correction(song_id, data, &transaction).await?;

    transaction.commit().await?;
    Ok(())
}

async fn update_correction(
    correction: correction::Model,
    data: NewSong,
    db: &DatabaseConnection,
) -> Result<(), RepositoryError> {
    let transaction = db.begin().await?;

    repo::song::update_correction(correction, data, &transaction).await?;

    transaction.commit().await?;

    Ok(())
}
