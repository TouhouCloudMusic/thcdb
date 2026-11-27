use auth_core::permission::{Permission, user_has_permission};
use chrono::Utc;
use domain::shared::CursorResponse;
use entity::sea_orm_active_enums::ImageQueueStatus;
use entity::{artist, image_queue, image_queue_subscription, release};
use image_queue_core::QueueTarget;
use infra_db::SeaOrmRepository;
use notification_core::ImageQueueModerationAction;
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel,
    PaginatorTrait, QueryFilter, QuerySelect,
};
use user_core::load_users;

use super::model::{
    ImageQueueAction, ImageQueueDetail, ImageQueueFilterQuery,
    ImageQueueTarget, ImageSummary, PendingImageQueueItem,
};
use super::{Error, repo};
use crate::features::artist::list as artist_list;
use crate::features::image_queue::shared::{UserSummary, load_list_metadata};
use crate::features::release::list::load_cover_art_urls;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::database::error::{BrokenEntityReference, DatabaseResultExt};
use crate::shared::error::InternalError;
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

        let mut metadata =
            load_list_metadata(&self.repo, &paginated.items).await?;
        let user_ids = paginated
            .items
            .iter()
            .map(|model| model.created_by)
            .collect::<Vec<_>>();
        let users = load_users(&self.repo.conn, user_ids)
            .await
            .db_context("load image queue users")?;

        let items = paginated
            .items
            .into_iter()
            .map(|model| {
                let created_by = users
                    .get(&model.created_by)
                    .cloned()
                    .unwrap_or_else(|| UserSummary::unknown(model.created_by));
                let (image_url, target) = metadata.take(&model);

                PendingImageQueueItem::new(
                    &model, created_by, image_url, target,
                )
            })
            .collect();

        Ok(CursorResponse {
            items,
            next_cursor: paginated.next_cursor,
        })
    }

    #[fastrace::trace(name = "image_queue.manage.count_pending")]
    pub(crate) async fn pending_image_queue_count(&self) -> Result<u64, Error> {
        let count = image_queue::Entity::find()
            .filter(image_queue::Column::Status.eq(ImageQueueStatus::Pending))
            .count(&self.repo.conn)
            .await
            .db_context("count pending image queue entries")?;
        Ok(count)
    }

    async fn load_detail_target(
        &self,
        target: QueueTarget,
    ) -> Result<ImageQueueTarget, Error> {
        let db = &self.repo.conn;
        match target {
            QueueTarget::Artist(id) => {
                let artist =
                    artist_list::load(artist::Entity::find_by_id(id), db)
                        .await?
                        .pop()
                        .ok_or_else(|| {
                            InternalError::new(BrokenEntityReference {
                                entity: "image queue artist",
                                id,
                            })
                        })?;

                Ok(ImageQueueTarget::Artist {
                    id,
                    name: artist.name,
                    current_image_url: artist.profile_image_url,
                })
            }
            QueueTarget::Release(id) => {
                let name = release::Entity::find_by_id(id)
                    .select_only()
                    .column(release::Column::Title)
                    .into_tuple::<String>()
                    .one(db)
                    .await
                    .db_context("load image queue release title")?
                    .ok_or_else(|| {
                        InternalError::new(BrokenEntityReference {
                            entity: "image queue release",
                            id,
                        })
                    })?;
                let current_image_url =
                    load_cover_art_urls(&[id], db).await?.remove(&id);

                Ok(ImageQueueTarget::Release {
                    id,
                    name,
                    current_image_url,
                })
            }
        }
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
        let target = self
            .load_detail_target(QueueTarget::try_from(&queue)?)
            .await?;

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
            .db_context("load image queue users")?;

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
                .db_context("check image queue subscription")?
                .is_some()
        } else {
            false
        };

        Ok(ImageQueueDetail {
            id: queue.id,
            previous_id: detail.previous_id,
            next_id: detail.next_id,
            image_id: queue.image_id,
            status: queue.status,
            created_at: queue.created_at,
            created_by,
            description: queue.description,
            handled_at: queue.handled_at,
            handled_by,
            reverted_at: queue.reverted_at,
            reverted_by,
            image,
            target,
            is_subscribed,
        })
    }

    #[fastrace::trace(name = "image_queue.service.moderate_image_queue")]
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
        .db_context("check image queue manage permission")?
        {
            return Err(Error::PermissionDenied);
        }

        let tx_repo = self.repo.begin_tx().await.db_context(match action {
            ImageQueueAction::Approve => {
                "begin approve image queue transaction"
            }
            ImageQueueAction::Reject => "begin reject image queue transaction",
            ImageQueueAction::Revert => "begin revert image queue transaction",
        })?;
        let model = repo::lock_queue(&tx_repo, id)
            .await?
            .ok_or(Error::NotFound)?;
        let expected_status = match action {
            ImageQueueAction::Approve | ImageQueueAction::Reject => {
                ImageQueueStatus::Pending
            }
            ImageQueueAction::Revert => ImageQueueStatus::Approved,
        };
        if model.status != expected_status {
            return Err(Error::InvalidOperation);
        }
        let image_id = model.image_id.ok_or(Error::InvalidEntry)?;

        match action {
            ImageQueueAction::Approve => {
                let target = QueueTarget::try_from(&model)?;
                repo::publish_image(&tx_repo, target, image_id).await?;
            }
            ImageQueueAction::Reject => {}
            ImageQueueAction::Revert => {
                let target = QueueTarget::try_from(&model)?;
                let entity = match target {
                    QueueTarget::Artist(_) => "published artist image",
                    QueueTarget::Release(_) => "published release image",
                };
                let rows_affected =
                    repo::delete_published_image(&tx_repo, target, image_id)
                        .await?;
                if rows_affected == 0 {
                    return Err(InternalError::new(BrokenEntityReference {
                        entity,
                        id: image_id,
                    })
                    .into());
                }
            }
        }

        let now = Utc::now().into();
        let mut active = model.into_active_model();
        let notification_action = match action {
            ImageQueueAction::Approve => {
                active.status = Set(ImageQueueStatus::Approved);
                active.handled_at = Set(Some(now));
                active.handled_by = Set(Some(user_id));
                ImageQueueModerationAction::Approved
            }
            ImageQueueAction::Reject => {
                active.status = Set(ImageQueueStatus::Rejected);
                active.handled_at = Set(Some(now));
                active.handled_by = Set(Some(user_id));
                ImageQueueModerationAction::Rejected
            }
            ImageQueueAction::Revert => {
                active.status = Set(ImageQueueStatus::Reverted);
                active.reverted_at = Set(Some(now));
                active.reverted_by = Set(Some(user_id));
                ImageQueueModerationAction::Reverted
            }
        };
        infra_db::observe::<_, Error, _>(
            "image_queue.manage.update_queue",
            async { Ok(active.update(tx_repo.conn()).await?) },
        )
        .await?;
        let notification_recipients =
            image_queue_notification::create_moderated_notification(
                tx_repo.conn(),
                user_id,
                id,
                notification_action,
            )
            .await?;
        tx_repo.commit().await?;

        self.user_events.publish(
            UserEvent::NotificationInboxUpdated,
            notification_recipients.user_ids,
        );

        Ok(())
    }
}
