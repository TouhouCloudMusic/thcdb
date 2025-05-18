use chrono::Utc;
use entity::correction::{Column, Entity};
use entity::enums::{CorrectionStatus, CorrectionUserType, EntityType};
use entity::{correction_revision, correction_user};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, IntoActiveModel,
    PaginatorTrait, QueryFilter, QueryOrder, QueryTrait,
};

use super::SeaOrmTxRepo;
use crate::domain::artist::TxRepo as _;
use crate::domain::correction::{
    ApproveCorrectionContext, Correction, CorrectionEntity, CorrectionFilter,
    CorrectionFilterStatus, NewCorrectionMeta, Repo, TxRepo,
};
use crate::domain::event::TxRepo as _;
use crate::domain::label::TxRepo as _;
use crate::domain::model::auth::CorrectionApprover;
use crate::domain::release::TxRepo as _;
use crate::domain::repository::Connection;
use crate::domain::song::TxRepo as _;
use crate::domain::tag::TxRepo as _;
use crate::error::InfraError;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: sea_orm::ConnectionTrait,
{
    async fn find_one(
        &self,
        filter: CorrectionFilter,
    ) -> Result<Option<Correction>, Self::Error> {
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
    ) -> Result<bool, Self::Error> {
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
    ) -> Result<(), Self::Error> {
        let new_correction = entity::correction::ActiveModel {
            id: NotSet,
            status: Set(CorrectionStatus::Pending),
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

        Ok(())
    }

    async fn update(
        &self,
        id: i32,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<(), Self::Error> {
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

    async fn approve(
        &self,
        correction_id: i32,
        CorrectionApprover(approver): CorrectionApprover,
        context: impl ApproveCorrectionContext,
    ) -> Result<(), InfraError> {
        let correction = entity::correction::Entity::find_by_id(correction_id)
            .one(self.conn())
            .await?
            .ok_or(DbErr::Custom(
                "Correction not found, but it should not happen".to_owned(),
            ))?;

        entity::correction_user::Entity::insert(
            entity::correction_user::ActiveModel {
                user_id: Set(approver.id),
                correction_id: Set(correction_id),
                user_type: Set(CorrectionUserType::Approver),
            },
        )
        .exec(self.conn())
        .await?;

        let mut correction_active_model = correction.into_active_model();
        correction_active_model.status = Set(CorrectionStatus::Approved);
        correction_active_model.handled_at = Set(Some(Utc::now().into()));

        let correction = correction_active_model.update(self.conn()).await?;

        match correction.entity_type {
            EntityType::Artist => {
                context.artist_repo().apply_update(correction).await?;
            }
            EntityType::Label => {
                context.label_repo().apply_update(correction).await?;
            }
            EntityType::Release => {
                context.release_repo().apply_update(correction).await?;
            }
            EntityType::Song => {
                context.song_repo().apply_update(correction).await?;
            }
            EntityType::Tag => {
                context.tag_repo().apply_update(correction).await?;
            }
            EntityType::Event => {
                context.event_repo().apply_update(correction).await?;
            }
        }

        Ok(())
    }
}
