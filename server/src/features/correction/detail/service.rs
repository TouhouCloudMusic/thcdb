use domain::shared::{Cursor, DEFAULT_LIMIT};
use entity::correction_subscription;
use infra_db::SeaOrmRepository;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use sea_query::all;

use super::model::CorrectionDetail;
use crate::features::comment::{CommentTargetKind, Service as CommentService};
use crate::features::correction::ReadError;
use crate::features::correction::shared::repo;
use crate::infra::database::error::DatabaseResultExt;

#[derive(Clone)]
pub(super) struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub(super) const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub(super) async fn find_correction(
        &self,
        correction_id: i32,
        viewer_user_id: Option<i32>,
    ) -> Result<Option<CorrectionDetail>, ReadError> {
        let Some(model) = repo::find_correction(&self.repo.conn, correction_id)
            .await
            .db_operation("find correction detail")?
        else {
            return Ok(None);
        };

        let entity_name = repo::find_entity_name(
            &self.repo.conn,
            model.entity_type,
            model.entity_id,
        )
        .await
        .db_operation("find correction entity name")?
        .ok_or(ReadError::NotFound("Correction not found"))?;

        let author = repo::find_author(&self.repo.conn, correction_id)
            .await
            .db_operation("find correction author")?;

        let comments = CommentService::new(self.repo.clone())
            .list_comments(
                CommentTargetKind::Correction,
                correction_id,
                Cursor {
                    at: 0,
                    limit: DEFAULT_LIMIT,
                },
            )
            .await?;

        let is_subscribed = match viewer_user_id {
            Some(user_id) => correction_subscription::Entity::find()
                .filter(all![
                    correction_subscription::Column::UserId.eq(user_id),
                    correction_subscription::Column::CorrectionId
                        .eq(correction_id),
                ])
                .one(&self.repo.conn)
                .await
                .db_operation("check correction subscription")?
                .is_some(),
            None => false,
        };

        Ok(Some(CorrectionDetail {
            id: model.id,
            status: model.status,
            r#type: model.r#type,
            entity_id: model.entity_id,
            entity_type: model.entity_type,
            entity_name,
            created_at: model.created_at,
            handled_at: model.handled_at,
            author,
            comments,
            is_subscribed: viewer_user_id.is_some().then_some(is_subscribed),
        }))
    }
}
