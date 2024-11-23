use crate::error::SongServiceError;
use bon::bon;
use chrono::Duration;
use entity::song;
use sea_orm::sea_query::{Func, SimpleExpr};
use sea_orm::{
    ActiveValue, DatabaseConnection, EntityTrait, Order, QueryOrder,
    QuerySelect,
};

#[derive(Default, Clone)]
pub struct Service {
    database: DatabaseConnection,
}

type Result<T> = std::result::Result<T, SongServiceError>;

#[bon]
impl Service {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<song::Model>> {
        song::Entity::find_by_id(id)
            .one(&self.database)
            .await
            .map_err(Into::into)
    }

    // TODO: move this to release track
    pub async fn random(&self, count: u64) -> Result<Vec<song::Model>> {
        song::Entity::find()
            .order_by(SimpleExpr::FunctionCall(Func::random()), Order::Desc)
            .limit(count)
            .all(&self.database)
            .await
            .map_err(Into::into)
    }

    #[builder]
    pub async fn create(
        &self,
        title: String,
        duration: Option<Duration>,
    ) -> Result<song::Model> {
        let new_song = song::ActiveModel {
            id: ActiveValue::NotSet,
            title: ActiveValue::Set(title),
            duration: ActiveValue::Set(duration.map(|d| d.to_string())),
            created_at: ActiveValue::NotSet,
            updated_at: ActiveValue::NotSet,
        };
        song::Entity::insert(new_song)
            .exec_with_returning(&self.database)
            .await
            .map_err(Into::into)
    }
}
