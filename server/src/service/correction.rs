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
use crate::domain::model::auth::UserRoleEnum;
use crate::error::ServiceError;
use crate::repo;

super::def_service!();

impl Service {
    pub async fn approve(
        &self,
        correction_id: i32,
        approver_id: i32,
    ) -> Result<(), ServiceError> {
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
    ) -> Result<bool, ServiceError> {
        let user_service = user::Service::new(self.db.clone());

        if user_service
            .get_roles(user_id)
            .await?
            .into_iter()
            .any(|r| UserRoleEnum::Admin == r || UserRoleEnum::Moderator == r)
        {
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
pub async fn create_or_update_correction<T, E, A, E1, E2>(
    entity_id: i32,
    entity_type: EntityType,
    user_id: i32,
    closure_args: A,
    on_create: impl AsyncFnOnce(entity::correction::Model, A) -> Result<T, E1>,
    on_update: impl AsyncFnOnce(entity::correction::Model, A) -> Result<T, E2>,
    db: &DatabaseConnection,
) -> Result<T, E>
where
    E: From<ServiceError> + From<E1> + From<E2>,
{
    let correction =
        repo::correction::find_latest(entity_id, entity_type, db).await?;

    let correction_service = Service::new(db.clone());

    let res = if correction.status == CorrectionStatus::Pending {
        if correction_service
            .is_author_or_admin(user_id, correction.id)
            .await?
        {
            return Err(ServiceError::Unauthorized.into());
        }
        on_update(correction, closure_args).await?
    } else {
        on_create(correction, closure_args).await?
    };

    Ok(res)
}
