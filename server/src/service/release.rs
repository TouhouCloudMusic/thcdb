use entity::release;
use sea_orm::{DatabaseConnection, DbErr, EntityTrait};

#[derive(Default, Clone)]
pub struct Service {
    database: DatabaseConnection,
}

impl Service {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> anyhow::Result<Option<release::Model>, DbErr> {
        release::Entity::find_by_id(id).one(&self.database).await
    }

    pub async fn create(
        &self,
        id: i32,
    ) -> anyhow::Result<Option<release::Model>, DbErr> {
        release::Entity::find_by_id(id).one(&self.database).await
    }
}
