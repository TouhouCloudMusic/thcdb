use super::model::{
    HandleImageQueueMethod, ImageQueueDetail, ImageQueueFilterQuery,
    ImageSummary, PendingImageQueueItem,
};
use super::{Error, repo};
use crate::domain::model::{ImageQueueManage, NotificationKindEnum};
use crate::domain::shared::CursorResponse;
use crate::features::image_queue::shared::{UserSummary, load_users};
use crate::features::notification;
use crate::infra::authz;
use crate::infra::database::error::DatabaseResultExt;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::shared::http::PaginationQuery;

#[derive(Clone)]
pub(crate) struct Service {
    repo: SeaOrmRepository,
    notification: notification::Service,
}

impl Service {
    pub(crate) const fn new(
        repo: SeaOrmRepository,
        notification: notification::Service,
    ) -> Self {
        Self { repo, notification }
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
        let users = load_users(&self.repo, user_ids).await?;

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
        user_id: i32,
        id: i32,
    ) -> Result<ImageQueueDetail, Error> {
        let detail = repo::find_detail(&self.repo, id)
            .await?
            .ok_or(Error::NotFound)?;

        if detail.queue.created_by != user_id
            && !authz::user_has_permission::<ImageQueueManage>(
                &self.repo.conn,
                user_id,
            )
            .await
            .with_operation("check image queue manage permission")?
        {
            return Err(Error::PermissionDenied);
        }

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
        let users = load_users(&self.repo, user_ids).await?;

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

        Ok(ImageQueueDetail::new(
            &queue,
            created_by,
            handled_by,
            reverted_by,
            image,
            detail.artist.map(Into::into),
            detail.release.map(Into::into),
        ))
    }

    pub(crate) async fn handle_image_queue(
        &self,
        user_id: i32,
        id: i32,
        method: HandleImageQueueMethod,
    ) -> Result<(), Error> {
        if !authz::user_has_permission::<ImageQueueManage>(
            &self.repo.conn,
            user_id,
        )
        .await
        .with_operation("check image queue manage permission")?
        {
            return Err(Error::PermissionDenied);
        }

        match method {
            HandleImageQueueMethod::Approve => {
                let handled = repo::approve(&self.repo, user_id, id).await?;
                self.notify_status(
                    &handled,
                    NotificationKindEnum::ImageApproved,
                    "Your image was approved",
                )
                .await;
            }
            HandleImageQueueMethod::Reject => {
                let handled = repo::reject(&self.repo, user_id, id).await?;
                self.notify_status(
                    &handled,
                    NotificationKindEnum::ImageRejected,
                    "Your image was rejected",
                )
                .await;
            }
            HandleImageQueueMethod::Revert => {
                let handled = repo::revert(&self.repo, user_id, id).await?;
                self.notify_status(
                    &handled,
                    NotificationKindEnum::ImageReverted,
                    "Your image was reverted",
                )
                .await;
            }
        }

        Ok(())
    }

    async fn notify_status(
        &self,
        handled: &repo::HandledImageQueue,
        kind: NotificationKindEnum,
        message: &'static str,
    ) {
        self.notification
            .notify_image_status_best_effort(
                handled.created_by,
                handled.image_id,
                kind,
                Some(message.to_owned()),
            )
            .await;
    }
}
