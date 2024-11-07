use entity::sea_orm_active_enums::EntityStatus;
use entity::song;
use sea_orm::prelude::DateTimeWithTimeZone;
use sea_orm::sea_query::{Func, SimpleExpr};
use sea_orm::{
    ActiveValue, DatabaseConnection, DbErr, EntityTrait, Order, QueryOrder,
    QuerySelect,
};

#[derive(Default, Clone)]
pub struct SongService {
    database: DatabaseConnection,
}

impl SongService {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> anyhow::Result<Option<song::Model>, DbErr> {
        song::Entity::find_by_id(id).one(&self.database).await
    }

    pub async fn random(
        &self,
        count: u64,
    ) -> anyhow::Result<Vec<song::Model>, DbErr> {
        song::Entity::find()
            .order_by(SimpleExpr::FunctionCall(Func::random()), Order::Desc)
            .limit(count)
            .all(&self.database)
            .await
    }

    pub async fn create(
        &self,
        status: EntityStatus,
        title: String,
        created_at: DateTimeWithTimeZone,
        updated_at: DateTimeWithTimeZone,
    ) -> anyhow::Result<song::Model, DbErr> {
        let new_song = song::ActiveModel {
            status: ActiveValue::Set(status),
            title: ActiveValue::Set(title),
            created_at: ActiveValue::Set(created_at),
            updated_at: ActiveValue::Set(updated_at),
            ..Default::default()
        };
        song::Entity::insert(new_song)
            .exec_with_returning(&self.database)
            .await
    }
}
