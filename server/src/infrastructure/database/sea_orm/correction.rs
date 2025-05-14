use entity::correction::{Column, Entity};
use entity::enums::CorrectionStatus;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter, QuerySelect};

use crate::domain::correction::Repo;
use crate::domain::repository::Connection;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: sea_orm::ConnectionTrait,
{
    async fn pending_correction(
        &self,
        id: i32,
        entity_type: entity::enums::EntityType,
    ) -> Result<Option<i32>, Self::Error> {
        Ok(Entity::find()
            .select_only()
            .column(Column::Id)
            .filter(Column::EntityId.eq(id))
            .filter(Column::EntityType.eq(entity_type))
            .filter(Column::Status.eq(CorrectionStatus::Pending))
            .one(self.conn())
            .await?
            .map(|x| x.id))
    }
}
