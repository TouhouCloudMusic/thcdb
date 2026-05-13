use chrono::{DateTime, FixedOffset, Utc};
use entity::{notification, user, user_role};
use sea_orm::ActiveValue::Set;
use sea_orm::prelude::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::domain::model::{NotificationKindEnum, NotificationTargetTypeEnum};
use crate::domain::shared::CursorResponse;
use crate::infra::database::error::DatabaseResultExt;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::notification::NotificationHub;
use crate::shared::error::MessageError;
use crate::shared::http::api_response::AppError;

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
    hub: NotificationHub,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NotificationPayload {
    pub summary: Option<String>,
    pub target_url: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
struct WsEvent<T> {
    #[serde(rename = "type")]
    r#type: &'static str,
    data: T,
}

#[derive(Clone, Debug, Serialize)]
struct WsNotificationData {
    id: i32,
    notification_kind: String,
    target_type: String,
    target_id: i32,
    summary: Option<String>,
    created_at: DateTime<FixedOffset>,
}

impl Service {
    pub const fn new(repo: SeaOrmRepository, hub: NotificationHub) -> Self {
        Self { repo, hub }
    }

    pub async fn create(
        &self,
        recipient_user_id: i32,
        kind: NotificationKindEnum,
        target_type: NotificationTargetTypeEnum,
        target_id: i32,
        payload: NotificationPayload,
    ) -> Result<notification::Model, AppError> {
        let payload_json =
            serde_json::to_string(&payload).map_err(|source| {
                AppError::internal(MessageError::new(format!(
                    "invalid notification payload: {source}",
                )))
            })?;

        let model = notification::ActiveModel {
            id: sea_orm::ActiveValue::NotSet,
            recipient_user_id: Set(recipient_user_id),
            notification_kind_id: Set(kind.into()),
            target_type_id: Set(target_type.into()),
            target_id: Set(target_id),
            payload: Set(payload_json),
            is_read: Set(false),
            created_at: sea_orm::ActiveValue::NotSet,
        }
        .insert(&self.repo.conn)
        .await
        .db_operation("insert notification")?;

        if self.should_push(recipient_user_id, kind).await? {
            let evt = WsEvent {
                r#type: "Notification",
                data: WsNotificationData {
                    id: model.id,
                    notification_kind: kind.to_string(),
                    target_type: target_type.to_string(),
                    target_id,
                    summary: payload.summary,
                    created_at: model.created_at,
                },
            };
            if let Ok(msg) = serde_json::to_string(&evt) {
                self.hub.publish(recipient_user_id, msg);
            }
        }

        Ok(model)
    }

    pub async fn list(
        &self,
        user_id: i32,
        limit: u8,
        cursor: Option<i32>,
    ) -> Result<CursorResponse<notification::Model>, AppError> {
        let mut select = notification::Entity::find()
            .filter(notification::Column::RecipientUserId.eq(user_id))
            .order_by_desc(notification::Column::Id);

        if let Some(cursor) = cursor {
            select = select.filter(notification::Column::Id.lt(cursor));
        }

        let mut models = select
            .limit(u64::from(limit) + 1)
            .all(&self.repo.conn)
            .await
            .db_operation("list notifications")?;

        let has_next = models.len() > usize::from(limit);
        if has_next {
            models.truncate(usize::from(limit));
        }

        let next_cursor = if has_next {
            models.last().map(|m| m.id)
        } else {
            None
        };

        Ok(CursorResponse {
            items: models,
            next_cursor,
        })
    }

    pub async fn unread_count(&self, user_id: i32) -> Result<u64, AppError> {
        notification::Entity::find()
            .filter(notification::Column::RecipientUserId.eq(user_id))
            .filter(notification::Column::IsRead.eq(false))
            .count(&self.repo.conn)
            .await
            .db_operation("count unread notifications")
            .map_err(Into::into)
    }

    pub async fn mark_read(
        &self,
        user_id: i32,
        notification_id: i32,
    ) -> Result<(), AppError> {
        let _ = notification::Entity::update_many()
            .filter(notification::Column::Id.eq(notification_id))
            .filter(notification::Column::RecipientUserId.eq(user_id))
            .col_expr(notification::Column::IsRead, Expr::value(true))
            .exec(&self.repo.conn)
            .await
            .db_operation("mark notification read")?;

        Ok(())
    }

    pub async fn read_all(&self, user_id: i32) -> Result<(), AppError> {
        let _ = notification::Entity::update_many()
            .filter(notification::Column::RecipientUserId.eq(user_id))
            .filter(notification::Column::IsRead.eq(false))
            .col_expr(notification::Column::IsRead, Expr::value(true))
            .exec(&self.repo.conn)
            .await
            .db_operation("mark all notifications read")?;

        Ok(())
    }

    pub async fn notify_correction_status(
        &self,
        correction_id: i32,
        kind: NotificationKindEnum,
        summary: Option<String>,
    ) -> Result<(), AppError> {
        let author_id = entity::correction_user::Entity::find()
            .filter(
                entity::correction_user::Column::CorrectionId.eq(correction_id),
            )
            .filter(
                entity::correction_user::Column::UserType.eq(
                    entity::sea_orm_active_enums::CorrectionUserType::Author,
                ),
            )
            .select_only()
            .column(entity::correction_user::Column::UserId)
            .into_tuple::<i32>()
            .one(&self.repo.conn)
            .await
            .db_operation("find correction notification author")?
            .ok_or_else(|| {
                AppError::internal(MessageError::new(
                    "correction author not found",
                ))
            })?;

        let _ = self
            .create(
                author_id,
                kind,
                NotificationTargetTypeEnum::Correction,
                correction_id,
                NotificationPayload {
                    summary,
                    target_url: None,
                },
            )
            .await?;

        Ok(())
    }

    pub async fn notify_correction_status_best_effort(
        &self,
        correction_id: i32,
        kind: NotificationKindEnum,
        summary: Option<String>,
    ) {
        if let Err(err) = self
            .notify_correction_status(correction_id, kind, summary)
            .await
        {
            log::error!(
                target: "features.notification.service",
                correction_id = correction_id,
                kind:% = kind,
                error:? = err;
                "failed to notify correction status"
            );
        }
    }

    pub async fn notify_correction_needs_review(
        &self,
        correction_id: i32,
        exclude_user_ids: &[i32],
    ) -> Result<(), AppError> {
        let reviewer_ids = user_role::Entity::find()
            .filter(user_role::Column::RoleId.is_in([1, 2]))
            .select_only()
            .column(user_role::Column::UserId)
            .into_tuple::<i32>()
            .all(&self.repo.conn)
            .await
            .db_operation("find correction notification reviewers")?;

        for reviewer_id in reviewer_ids {
            if exclude_user_ids.contains(&reviewer_id) {
                continue;
            }
            let _ = self
                .create(
                    reviewer_id,
                    NotificationKindEnum::CorrectionNeedsReview,
                    NotificationTargetTypeEnum::Correction,
                    correction_id,
                    NotificationPayload {
                        summary: Some("A correction needs review".to_owned()),
                        target_url: None,
                    },
                )
                .await?;
        }

        Ok(())
    }

    pub async fn notify_correction_needs_review_best_effort(
        &self,
        correction_id: i32,
        exclude_user_ids: &[i32],
    ) {
        if let Err(err) = self
            .notify_correction_needs_review(correction_id, exclude_user_ids)
            .await
        {
            log::error!(
                target: "features.notification.service",
                correction_id = correction_id,
                error:? = err;
                "failed to notify correction review"
            );
        }
    }

    pub async fn notify_image_status(
        &self,
        created_by: i32,
        image_id: i32,
        kind: NotificationKindEnum,
        summary: Option<String>,
    ) -> Result<(), AppError> {
        let _ = self
            .create(
                created_by,
                kind,
                NotificationTargetTypeEnum::Image,
                image_id,
                NotificationPayload {
                    summary,
                    target_url: None,
                },
            )
            .await?;

        Ok(())
    }

    pub async fn notify_image_status_best_effort(
        &self,
        created_by: i32,
        image_id: i32,
        kind: NotificationKindEnum,
        summary: Option<String>,
    ) {
        if let Err(err) = self
            .notify_image_status(created_by, image_id, kind, summary)
            .await
        {
            log::error!(
                target: "features.notification.service",
                created_by = created_by,
                image_id = image_id,
                kind:% = kind,
                error:? = err;
                "failed to notify image status"
            );
        }
    }

    pub async fn create_best_effort(
        &self,
        recipient_user_id: i32,
        kind: NotificationKindEnum,
        target_type: NotificationTargetTypeEnum,
        target_id: i32,
        payload: NotificationPayload,
    ) {
        if let Err(err) = self
            .create(recipient_user_id, kind, target_type, target_id, payload)
            .await
        {
            log::error!(
                target: "features.notification.service",
                recipient_user_id = recipient_user_id,
                kind:% = kind,
                target_type:% = target_type,
                target_id = target_id,
                error:? = err;
                "failed to create notification"
            );
        }
    }

    pub fn decode_payload(payload: &str) -> Value {
        serde_json::from_str(payload)
            .unwrap_or_else(|_| Value::Object(serde_json::Map::default()))
    }

    async fn should_push(
        &self,
        user_id: i32,
        kind: NotificationKindEnum,
    ) -> Result<bool, AppError> {
        let model = user::Entity::find_by_id(user_id)
            .one(&self.repo.conn)
            .await
            .db_operation("find notification recipient settings")?;

        let model = model.ok_or_else(|| {
            AppError::internal(MessageError::new("user not found"))
        })?;
        let notif = model.settings.get("notification");
        let get_bool = |key: &str, default_val: bool| {
            notif
                .and_then(|v| v.get(key))
                .and_then(Value::as_bool)
                .unwrap_or(default_val)
        };

        let enabled = match kind {
            NotificationKindEnum::CommentReply
            | NotificationKindEnum::CommentModeration => {
                get_bool("comment_reply_enabled", true)
            }
            NotificationKindEnum::CommentMention => {
                get_bool("comment_mention_enabled", true)
            }
            NotificationKindEnum::CorrectionApproved
            | NotificationKindEnum::CorrectionRejected
            | NotificationKindEnum::CorrectionNeedsReview
            | NotificationKindEnum::CorrectionComment => {
                get_bool("correction_status_enabled", true)
            }
            NotificationKindEnum::NewFollower
            | NotificationKindEnum::FollowingActivity => {
                get_bool("new_follower_enabled", true)
            }
            NotificationKindEnum::ImageApproved
            | NotificationKindEnum::ImageRejected
            | NotificationKindEnum::ImageReverted
            | NotificationKindEnum::Unknown(_) => true,
        };

        Ok(enabled)
    }

    pub async fn cleanup_expired(
        &self,
        retention_days: i64,
    ) -> Result<u64, AppError> {
        let cutoff: chrono::DateTime<chrono::FixedOffset> =
            (Utc::now() - chrono::Duration::days(retention_days)).into();
        let res = notification::Entity::delete_many()
            .filter(notification::Column::CreatedAt.lt(cutoff))
            .exec(&self.repo.conn)
            .await
            .db_operation("cleanup expired notifications")?;

        Ok(res.rows_affected)
    }
}
