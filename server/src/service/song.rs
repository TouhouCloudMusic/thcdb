use entity::sea_orm_active_enums::{CorrectionStatus, EntityType};
use entity::{correction, song};
use sea_orm::{DatabaseConnection, DbErr, TransactionTrait};

use crate::dto::song::{NewSong, SongResponse};
use crate::error::RepositoryError;
use crate::repo;

#[derive(Clone)]
pub struct SongService {
    db: DatabaseConnection,
}

impl SongService {
    pub const fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

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

    async fn create_correction(
        &self,
        song_id: i32,
        data: NewSong,
    ) -> Result<(), RepositoryError> {
        let transaction = self.db.begin().await?;

        repo::song::create_correction(song_id, data, &transaction).await?;

        transaction.commit().await?;
        Ok(())
    }

    async fn update_correction(
        &self,
        correction: correction::Model,
        data: NewSong,
    ) -> Result<(), RepositoryError> {
        let transaction = self.db.begin().await?;

        repo::song::update_correction(correction, data, &transaction).await?;

        transaction.commit().await?;

        Ok(())
    }

    pub async fn create_or_update_correction(
        &self,
        song_id: i32,
        data: NewSong,
    ) -> Result<(), RepositoryError> {
        let correction =
            repo::correction::find_latest(song_id, EntityType::Song, &self.db)
                .await?;

        let correction_service =
            super::correction::Service::new(self.db.clone());

        if correction_service
            .is_author_or_admin(data.metadata.author_id, correction.id)
            .await?
        {
            return Err(RepositoryError::Unauthorized);
        }

        if correction.status == CorrectionStatus::Pending {
            self.update_correction(correction, data).await
        } else {
            self.create_correction(song_id, data).await
        }
    }
}
