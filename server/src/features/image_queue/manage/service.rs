use auth_core::permission::{Permission, user_has_permission};
use domain::shared::CursorResponse;
use entity::image_queue_subscription;
use infra_db::SeaOrmRepository;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use user_core::load_users;

use super::model::{
    ImageQueueAction, ImageQueueDetail, ImageQueueFilterQuery, ImageSummary,
    PendingImageQueueItem,
};
use super::{Error, repo};
use crate::features::image_queue::shared::UserSummary;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::PaginationQuery;

#[derive(Clone)]
pub(crate) struct Service {
    repo: SeaOrmRepository,
    user_events: UserEventSender,
}

impl Service {
    pub(crate) const fn new(
        repo: SeaOrmRepository,
        user_events: UserEventSender,
    ) -> Self {
        Self { repo, user_events }
    }

    pub(crate) async fn pending_image_queue(
        &self,
        pagination: PaginationQuery,
        filter: ImageQueueFilterQuery,
    ) -> Result<CursorResponse<PendingImageQueueItem>, Error> {
        let paginated = repo::find_pending(
            &self.repo,
            pagination.limit(),
            pagination.cursor,
            filter.status,
            filter.r#type,
        )
        .await?;

        let user_ids = paginated
            .items
            .iter()
            .map(|model| model.created_by)
            .collect::<Vec<_>>();
        let users = load_users(&self.repo.conn, user_ids)
            .await
            .db_operation("load image queue users")?;

        let items = paginated
            .items
            .into_iter()
            .map(|model| {
                let created_by = users
                    .get(&model.created_by)
                    .cloned()
                    .unwrap_or_else(|| UserSummary::unknown(model.created_by));

                PendingImageQueueItem::new(&model, created_by)
            })
            .collect();

        Ok(CursorResponse {
            items,
            next_cursor: paginated.next_cursor,
        })
    }

    pub(crate) async fn pending_image_queue_count(&self) -> Result<u64, Error> {
        Ok(repo::count_pending(&self.repo).await?)
    }

    pub(crate) async fn image_queue_detail(
        &self,
        user_id: Option<i32>,
        id: i32,
    ) -> Result<ImageQueueDetail, Error> {
        let detail = repo::find_detail(&self.repo, id)
            .await?
            .ok_or(Error::NotFound)?;

        let queue = detail.queue;
        let image = detail.image;
        let user_ids = [
            Some(queue.created_by),
            queue.handled_by,
            queue.reverted_by,
            image.as_ref().map(|model| model.uploaded_by),
        ]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
        let users = load_users(&self.repo.conn, user_ids)
            .await
            .db_operation("load image queue users")?;

        let image = image.map(|image| {
            let uploaded_by = users
                .get(&image.uploaded_by)
                .cloned()
                .unwrap_or_else(|| UserSummary::unknown(image.uploaded_by));

            ImageSummary::new(image, uploaded_by)
        });

        let created_by = users
            .get(&queue.created_by)
            .cloned()
            .unwrap_or_else(|| UserSummary::unknown(queue.created_by));
        let handled_by = queue.handled_by.map(|user_id| {
            users
                .get(&user_id)
                .cloned()
                .unwrap_or_else(|| UserSummary::unknown(user_id))
        });
        let reverted_by = queue.reverted_by.map(|user_id| {
            users
                .get(&user_id)
                .cloned()
                .unwrap_or_else(|| UserSummary::unknown(user_id))
        });

        let is_subscribed = if let Some(user_id) = user_id {
            image_queue_subscription::Entity::find()
                .filter(image_queue_subscription::Column::UserId.eq(user_id))
                .filter(image_queue_subscription::Column::ImageQueueId.eq(id))
                .one(&self.repo.conn)
                .await
                .db_operation("check image queue subscription")?
                .is_some()
        } else {
            false
        };

        Ok(ImageQueueDetail {
            id: queue.id,
            image_id: queue.image_id,
            status: queue.status,
            created_at: queue.created_at,
            created_by,
            handled_at: queue.handled_at,
            handled_by,
            reverted_at: queue.reverted_at,
            reverted_by,
            image,
            artist: detail.artist.map(Into::into),
            release: detail.release.map(Into::into),
            is_subscribed,
        })
    }

    pub(crate) async fn moderate_image_queue(
        &self,
        user_id: i32,
        id: i32,
        action: ImageQueueAction,
    ) -> Result<(), Error> {
        if !user_has_permission(
            &self.repo.conn,
            user_id,
            Permission::ImageQueueManage,
        )
        .await
        .db_operation("check image queue manage permission")?
        {
            return Err(Error::PermissionDenied);
        }

        let notification_recipients = match action {
            ImageQueueAction::Approve => {
                repo::approve(&self.repo, user_id, id).await
            }
            ImageQueueAction::Reject => {
                repo::reject(&self.repo, user_id, id).await
            }
            ImageQueueAction::Revert => {
                repo::revert(&self.repo, user_id, id).await
            }
        }?;
        self.user_events.publish(
            UserEvent::NotificationInboxUpdated,
            notification_recipients.user_ids,
        );

        Ok(())
    }
}
