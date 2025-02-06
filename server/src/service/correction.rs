use entity::correction_user;
use entity::sea_orm_active_enums::CorrectionUserType;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    TransactionTrait,
};

use super::user::UserService;
use crate::error::RepositoryError;
use crate::repo;

#[derive(Clone)]
pub struct Service {
    db: DatabaseConnection,
}

impl Service {
    pub const fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn approve(
        &self,
        correction_id: i32,
        approver_id: i32,
    ) -> Result<(), RepositoryError> {
        let transaction = self.db.begin().await?;
        let tx = &transaction;

        repo::correction::approve(correction_id, approver_id, tx).await?;

        transaction.commit().await?;

        Ok(())
    }

    pub async fn is_author_or_admin(
        &self,
        user_id: i32,
        correction_id: i32,
    ) -> Result<bool, RepositoryError> {
        let user_service = UserService::new(self.db.clone());

        if user_service.have_role(user_id, "Admin").await? {
            return Ok(true);
        }

        let count = correction_user::Entity::find()
            .filter(correction_user::Column::CorrectionId.eq(correction_id))
            .filter(correction_user::Column::UserId.eq(user_id))
            .filter(
                correction_user::Column::UserType
                    .eq(CorrectionUserType::Author),
            )
            .count(&self.db)
            .await?;

        Ok(count != 0)
    }
}
