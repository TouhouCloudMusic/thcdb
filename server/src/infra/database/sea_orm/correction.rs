use entity::correction::{Column, Entity};
use entity::correction_revision;
use entity::enums::CorrectionUserType;
use entity::correction_user;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel,
    PaginatorTrait, QueryFilter, QueryOrder, QueryTrait,
};

use super::{SeaOrmRepository, SeaOrmTxRepo};
use crate::domain::correction::{
    Correction, CorrectionEntity, CorrectionFilter, CorrectionFilterStatus,
    NewCorrectionMeta, Repo, TxRepo,
};

impl Repo for SeaOrmRepository {
    async fn find_one(
        &self,
        filter: CorrectionFilter,
    ) -> Result<Option<Correction>, Box<dyn std::error::Error + Send + Sync>>
    {
        let ret = Entity::find()
            .filter(Column::EntityId.eq(filter.entity_id))
            .filter(Column::EntityType.eq(filter.entity_type))
            .apply_if(filter.status, |query, status| match status {
                CorrectionFilterStatus::Many(many) => {
                    query.filter(Column::Status.is_in(many))
                }
                CorrectionFilterStatus::One(one) => {
                    query.filter(Column::Status.eq(one))
                }
            })
            .order_by_desc(Column::CreatedAt)
            .one(&self.conn)
            .await?
            .map(|model| Correction {
                id: model.id,
                status: model.status,
                r#type: model.r#type,
                entity_id: model.entity_id,
                entity_type: model.entity_type,
                created_at: model.created_at,
                handled_at: model.handled_at,
            });
        Ok(ret)
    }

    async fn is_author(
        &self,
        user: &crate::domain::user::User,
        correction: &Correction,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let correction_id = correction.id;
        let count = correction_user::Entity::find()
            .filter(correction_user::Column::CorrectionId.eq(correction_id))
            .filter(correction_user::Column::UserId.eq(user.id))
            .filter(
                correction_user::Column::UserType
                    .eq(CorrectionUserType::Author),
            )
            .count(&self.conn)
            .await?;
        Ok(count != 0)
    }
}

impl Repo for SeaOrmTxRepo {
    async fn find_one(
        &self,
        filter: CorrectionFilter,
    ) -> Result<Option<Correction>, Box<dyn std::error::Error + Send + Sync>>
    {
        let ret = Entity::find()
            .filter(Column::EntityId.eq(filter.entity_id))
            .filter(Column::EntityType.eq(filter.entity_type))
            .apply_if(filter.status, |query, status| match status {
                CorrectionFilterStatus::Many(many) => {
                    query.filter(Column::Status.is_in(many))
                }
                CorrectionFilterStatus::One(one) => {
                    query.filter(Column::Status.eq(one))
                }
            })
            .order_by_desc(Column::CreatedAt)
            .one(self.conn())
            .await?
            .map(|model| Correction {
                id: model.id,
                status: model.status,
                r#type: model.r#type,
                entity_id: model.entity_id,
                entity_type: model.entity_type,
                created_at: model.created_at,
                handled_at: model.handled_at,
            });
        Ok(ret)
    }

    async fn is_author(
        &self,
        user: &crate::domain::user::User,
        correction: &Correction,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let correction_id = correction.id;
        let count = correction_user::Entity::find()
            .filter(correction_user::Column::CorrectionId.eq(correction_id))
            .filter(correction_user::Column::UserId.eq(user.id))
            .filter(
                correction_user::Column::UserType
                    .eq(CorrectionUserType::Author),
            )
            .count(self.conn())
            .await?;
        Ok(count != 0)
    }
}

impl TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let new_correction = entity::correction::ActiveModel {
            id: NotSet,
            status: Set(meta.status),
            r#type: Set(meta.r#type),
            entity_type: Set(meta.entity_type()),
            entity_id: Set(meta.entity_id),
            created_at: NotSet,
            handled_at: NotSet,
        }
        .insert(self.conn())
        .await?;

        let correction_id = new_correction.id;

        // TODO: remove dupelicate correction user table
        entity::correction_user::Model {
            correction_id,
            user_id: meta.author.id,
            user_type: CorrectionUserType::Author,
        }
        .into_active_model()
        .insert(self.conn())
        .await?;

        correction_revision::Model {
            correction_id,
            entity_history_id: meta.history_id,
            description: meta.description,
            author_id: meta.author.id,
        }
        .into_active_model()
        .insert(self.conn())
        .await?;

        Ok(correction_id)
    }

    async fn update(
        &self,
        id: i32,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        correction_revision::Model {
            correction_id: id,
            entity_history_id: meta.history_id,
            description: meta.description,
            author_id: meta.author.id,
        }
        .into_active_model()
        .insert(self.conn())
        .await?;

        Ok(())
    }

}
