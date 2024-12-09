use entity::song;
use sea_orm::sea_query::{Func, SimpleExpr};
use sea_orm::{
    DatabaseConnection, EntityTrait, Order, QueryOrder, QuerySelect,
    TransactionTrait,
};

use crate::error::SongServiceError;
use crate::model::song::NewSong;
use crate::repository;

type Result<T> = std::result::Result<T, SongServiceError>;

pub async fn find_by_id(
    id: i32,
    db: &DatabaseConnection,
) -> Result<Option<song::Model>> {
    song::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(Into::into)
}

// TODO: move this to release track
pub async fn random(
    count: u64,
    db: &DatabaseConnection,
) -> Result<Vec<song::Model>> {
    song::Entity::find()
        .order_by(SimpleExpr::FunctionCall(Func::random()), Order::Desc)
        .limit(count)
        .all(db)
        .await
        .map_err(Into::into)
}

pub async fn create(
    data: NewSong,
    db: &DatabaseConnection,
) -> Result<song::Model> {
    let transcation = db.begin().await?;

    let result = repository::song::create(data.into(), &transcation).await?;

    transcation.commit().await?;
    Ok(result.into_iter().next().unwrap())
}
