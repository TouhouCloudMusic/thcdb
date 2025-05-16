use bon::builder;
use entity::correction_user;
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionUserType, EntityType,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    TransactionTrait,
};

use crate::domain::model::auth::UserRoleEnum;
use crate::domain::user::User;
use crate::error::ServiceError;


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
}

#[builder]
pub async fn create_or_update_correction<T, E, A, E1, E2>(
    entity_id: i32,
    entity_type: EntityType,
    user: &User,
    closure_args: A,
    on_create: impl AsyncFnOnce(entity::correction::Model, A) -> Result<T, E1>,
    on_update: impl AsyncFnOnce(entity::correction::Model, A) -> Result<T, E2>,
    db: &impl ConnectionTrait,
) -> Result<T, E>
where
    E: From<ServiceError> + From<E1> + From<E2>,
{
    let correction =
        repo::correction::find_latest(entity_id, entity_type, db).await?;

    let res = if correction.status == CorrectionStatus::Pending {
        let is_author_or_admin = {
            if user.roles.iter().any(|r| {
                UserRoleEnum::try_from(r.id).is_ok_and(|role| {
                    matches!(
                        role,
                        UserRoleEnum::Admin | UserRoleEnum::Moderator
                    )
                })
            }) {
                true
            } else {
                correction_user::Entity::find()
                    .filter(
                        correction_user::Column::CorrectionId.eq(correction.id),
                    )
                    .filter(correction_user::Column::UserId.eq(user.id))
                    .filter(
                        correction_user::Column::UserType
                            .eq(CorrectionUserType::Author),
                    )
                    .count(db)
                    .await
                    .map_err(ServiceError::from)?
                    > 0
            }
        };

        if !is_author_or_admin {
            return Err(ServiceError::Unauthorized.into());
        }
        on_update(correction, closure_args).await?
    } else {
        on_create(correction, closure_args).await?
    };

    Ok(res)
}
