use entity::song;
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::song::NewSong;
use crate::error::SongServiceError;
use crate::repository;

type Result<T> = std::result::Result<T, SongServiceError>;

#[derive(Clone)]
pub struct SongService {
    db: DatabaseConnection,
}

impl SongService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<song::Model>> {
        let transcation = self.db.begin().await?;

        let result = repository::song::find_by_id(id, &transcation).await?;

        transcation.commit().await?;

        Ok(result)
    }

    pub async fn create(&self, data: NewSong) -> Result<song::Model> {
        let transcation = self.db.begin().await?;

        let result = repository::song::create(data, &transcation).await?;

        transcation.commit().await?;
        Ok(result)
    }
}

// TODO: move this to release track
// pub async fn random(
//     count: u64,
//     db: &DatabaseConnection,
// ) -> Result<Vec<song::Model>> {
//     song::Entity::find()
//         .order_by(SimpleExpr::FunctionCall(Func::random()), Order::Desc)
//         .limit(count)
//         .all(db)
//         .await
//         .map_err(Into::into)
// }
