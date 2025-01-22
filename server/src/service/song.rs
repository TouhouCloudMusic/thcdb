use entity::song;
use sea_orm::{DatabaseConnection, DbErr, TransactionTrait};

use crate::dto::song::NewSong;
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
    ) -> Result<Option<song::Model>, DbErr> {
        let transaction = self.db.begin().await?;

        let result = repo::song::find_by_id(id, &transaction).await?;

        transaction.commit().await?;

        Ok(result)
    }

    pub async fn create(&self, data: NewSong) -> Result<song::Model, DbErr> {
        let transaction = self.db.begin().await?;

        let result = repo::song::create(data, &transaction).await?;

        transaction.commit().await?;
        Ok(result)
    }
}
