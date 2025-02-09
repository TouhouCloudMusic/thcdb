use bon::builder;
use entity::correction_user;
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionUserType, EntityType,
};
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    TransactionTrait,
};

use super::*;
use crate::error::RepositoryError;
use crate::repo;

super::def_service!();

impl Service {
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
        let user_service = user::Service::new(self.db.clone());

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

#[builder]
pub async fn create_or_update_correction<T, E, A, F1, F2, E1, E2>(
    entity_id: i32,
    entity_type: EntityType,
    user_id: i32,
    closure_args: A,
    on_create: F1,
    on_update: F2,
    db: &DatabaseConnection,
) -> Result<T, E>
where
    F1: AsyncFnOnce(entity::correction::Model, A) -> Result<T, E1>,
    F2: AsyncFnOnce(entity::correction::Model, A) -> Result<T, E2>,
    E: From<RepositoryError> + From<E1> + From<E2>,
{
    let correction =
        repo::correction::find_latest(entity_id, entity_type, db).await?;

    let correction_service = Service::new(db.clone());

    let res = if correction.status == CorrectionStatus::Pending {
        if correction_service
            .is_author_or_admin(user_id, correction.id)
            .await?
        {
            return Err(RepositoryError::Unauthorized.into());
        }
        on_update(correction, closure_args).await?
    } else {
        on_create(correction, closure_args).await?
    };

    Ok(res)
}
