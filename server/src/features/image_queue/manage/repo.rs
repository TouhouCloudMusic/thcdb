use chrono::Utc;
use domain::shared::CursorResponse;
use entity::sea_orm_active_enums::ImageQueueStatus;
use entity::{
    artist_image as artist_image_entity,
    artist_image_queue as artist_image_queue_entity, image as image_entity,
    image_queue as image_queue_entity, release_image as release_image_entity,
    release_image_queue as release_image_queue_entity,
};
use infra_db::{SeaOrmRepository, SeaOrmTxRepo};
use notification_core::{ImageQueueModerationAction, NotificationRecipients};
use sea_orm::ActiveValue::Set;
use sea_orm::sea_query::{Expr, Query, SimpleExpr};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, FromQueryResult,
    IntoActiveModel, JoinType, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, QueryTrait, RelationTrait,
};

use super::{Error, ImageQueueType};
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};
use crate::shared::error::InternalError;

pub struct ImageQueueDetailModels {
    pub queue: image_queue_entity::Model,
    pub previous_id: Option<i32>,
    pub next_id: Option<i32>,
    pub image: Option<image_entity::Model>,
    pub artist: Option<artist_image_queue_entity::Model>,
    pub release: Option<release_image_queue_entity::Model>,
}

#[derive(FromQueryResult)]
struct ImageQueueDetailRow {
    #[sea_orm(nested)]
    queue: image_queue_entity::Model,
    previous_id: Option<i32>,
    next_id: Option<i32>,
}

enum QueueTarget {
    Artist(artist_image_queue_entity::Model),
    Release(release_image_queue_entity::Model),
}

pub async fn find_pending(
    repo: &SeaOrmRepository,
    limit: u8,
    cursor: Option<i32>,
    status: Option<ImageQueueStatus>,
    queue_type: Option<ImageQueueType>,
) -> Result<CursorResponse<image_queue_entity::Model>, DatabaseError> {
    let select = image_queue_entity::Entity::find()
        .order_by_desc(image_queue_entity::Column::Id)
        .apply_if(status, |query, status| {
            query.filter(image_queue_entity::Column::Status.eq(status))
        })
        .apply_if(queue_type, |query, queue_type| {
            match queue_type {
                ImageQueueType::Artist => query.join(
                    JoinType::InnerJoin,
                    image_queue_entity::Relation::ArtistImageQueue.def(),
                ),
                ImageQueueType::Release => query.join(
                    JoinType::InnerJoin,
                    image_queue_entity::Relation::ReleaseImageQueue.def(),
                ),
            }
            .distinct()
        })
        .apply_if(cursor, |query, cursor| {
            query.filter(image_queue_entity::Column::Id.lt(cursor))
        });

    let mut models = select
        .limit(u64::from(limit) + 1)
        .all(&repo.conn)
        .await
        .db_operation("find pending image queue entries")?;

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

pub async fn count_pending(
    repo: &SeaOrmRepository,
) -> Result<u64, DatabaseError> {
    image_queue_entity::Entity::find()
        .filter(
            image_queue_entity::Column::Status.eq(ImageQueueStatus::Pending),
        )
        .count(&repo.conn)
        .await
        .db_operation("count pending image queue entries")
}

pub async fn find_detail(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<ImageQueueDetailModels>, DatabaseError> {
    let previous_id_query = Query::select()
        .expr(Expr::col(image_queue_entity::Column::Id).min())
        .from(image_queue_entity::Entity)
        .and_where(Expr::col(image_queue_entity::Column::Id).gt(id))
        .to_owned();
    let next_id_query = Query::select()
        .expr(Expr::col(image_queue_entity::Column::Id).max())
        .from(image_queue_entity::Entity)
        .and_where(Expr::col(image_queue_entity::Column::Id).lt(id))
        .to_owned();

    let Some(ImageQueueDetailRow {
        queue,
        previous_id,
        next_id,
    }) = image_queue_entity::Entity::find_by_id(id)
        .expr_as(
            SimpleExpr::SubQuery(
                None,
                Box::new(previous_id_query.into_sub_query_statement()),
            ),
            "previous_id",
        )
        .expr_as(
            SimpleExpr::SubQuery(
                None,
                Box::new(next_id_query.into_sub_query_statement()),
            ),
            "next_id",
        )
        .into_model::<ImageQueueDetailRow>()
        .one(&repo.conn)
        .await
        .db_operation("find image queue entry detail")?
    else {
        return Ok(None);
    };

    let image = match queue.image_id {
        Some(image_id) => image_entity::Entity::find_by_id(image_id)
            .one(&repo.conn)
            .await
            .db_operation("find queued image")?,
        None => None,
    };

    let artist = artist_image_queue_entity::Entity::find()
        .filter(artist_image_queue_entity::Column::QueueId.eq(id))
        .one(&repo.conn)
        .await
        .db_operation("find artist image queue target")?;

    let release = release_image_queue_entity::Entity::find()
        .filter(release_image_queue_entity::Column::QueueId.eq(id))
        .one(&repo.conn)
        .await
        .db_operation("find release image queue target")?;

    Ok(Some(ImageQueueDetailModels {
        queue,
        previous_id,
        next_id,
        image,
        artist,
        release,
    }))
}

pub async fn approve(
    repo: &SeaOrmRepository,
    user_id: i32,
    id: i32,
) -> Result<NotificationRecipients, Error> {
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin approve image queue transaction")?;

    let model = lock_queue(&tx_repo, id).await?;

    if model.status != ImageQueueStatus::Pending {
        return Err(Error::InvalidOperation);
    }

    let image_id = model.image_id.ok_or(Error::InvalidEntry)?;
    let target = find_queue_target(&tx_repo, id).await?;

    match target {
        QueueTarget::Artist(target) => {
            artist_image_entity::Entity::insert(
                artist_image_entity::ActiveModel {
                    artist_id: Set(target.artist_id),
                    image_id: Set(image_id),
                    r#type: Set(target.r#type),
                },
            )
            .exec(tx_repo.conn())
            .await
            .db_operation("publish artist image queue entry")?;
        }
        QueueTarget::Release(target) => {
            release_image_entity::Entity::insert(
                release_image_entity::ActiveModel {
                    release_id: Set(target.release_id),
                    image_id: Set(image_id),
                    r#type: Set(target.r#type),
                },
            )
            .exec(tx_repo.conn())
            .await
            .db_operation("publish release image queue entry")?;
        }
    }

    let now = Utc::now().into();

    let mut active = model.into_active_model();
    active.status = Set(ImageQueueStatus::Approved);
    active.handled_at = Set(Some(now));
    active.handled_by = Set(Some(user_id));
    active
        .update(tx_repo.conn())
        .await
        .db_operation("mark image queue entry approved")?;

    let notification_recipients =
        image_queue_notification::create_moderated_notification(
            tx_repo.conn(),
            user_id,
            id,
            ImageQueueModerationAction::Approved,
        )
        .await?;

    tx_repo
        .commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;

    Ok(notification_recipients)
}

pub async fn reject(
    repo: &SeaOrmRepository,
    user_id: i32,
    id: i32,
) -> Result<NotificationRecipients, Error> {
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin reject image queue transaction")?;

    let model = lock_queue(&tx_repo, id).await?;

    if model.status != ImageQueueStatus::Pending {
        return Err(Error::InvalidOperation);
    }

    model.image_id.ok_or(Error::InvalidEntry)?;
    let now = Utc::now().into();

    let mut active = model.into_active_model();
    active.status = Set(ImageQueueStatus::Rejected);
    active.image_id = Set(None);
    active.handled_at = Set(Some(now));
    active.handled_by = Set(Some(user_id));
    active
        .update(tx_repo.conn())
        .await
        .db_operation("mark image queue entry rejected")?;

    let notification_recipients =
        image_queue_notification::create_moderated_notification(
            tx_repo.conn(),
            user_id,
            id,
            ImageQueueModerationAction::Rejected,
        )
        .await?;

    tx_repo
        .commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;

    Ok(notification_recipients)
}

pub async fn revert(
    repo: &SeaOrmRepository,
    user_id: i32,
    id: i32,
) -> Result<NotificationRecipients, Error> {
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin revert image queue transaction")?;

    let model = lock_queue(&tx_repo, id).await?;

    if model.status != ImageQueueStatus::Approved {
        return Err(Error::InvalidOperation);
    }

    let image_id = model.image_id.ok_or(Error::InvalidEntry)?;
    let target = find_queue_target(&tx_repo, id).await?;

    match target {
        QueueTarget::Artist(target) => {
            let result = artist_image_entity::Entity::delete_many()
                .filter(
                    artist_image_entity::Column::ArtistId.eq(target.artist_id),
                )
                .filter(artist_image_entity::Column::ImageId.eq(image_id))
                .filter(artist_image_entity::Column::Type.eq(target.r#type))
                .exec(tx_repo.conn())
                .await
                .db_operation("delete published artist image queue entry")?;

            if result.rows_affected == 0 {
                return Err(InternalError::new(BrokenEntityReference {
                    entity: "published artist image",
                    id: image_id,
                })
                .into());
            }
        }
        QueueTarget::Release(target) => {
            let result = release_image_entity::Entity::delete_many()
                .filter(
                    release_image_entity::Column::ReleaseId
                        .eq(target.release_id),
                )
                .filter(release_image_entity::Column::ImageId.eq(image_id))
                .filter(release_image_entity::Column::Type.eq(target.r#type))
                .exec(tx_repo.conn())
                .await
                .db_operation("delete published release image queue entry")?;

            if result.rows_affected == 0 {
                return Err(InternalError::new(BrokenEntityReference {
                    entity: "published release image",
                    id: image_id,
                })
                .into());
            }
        }
    }

    let now = Utc::now().into();

    let mut active = model.into_active_model();
    active.status = Set(ImageQueueStatus::Reverted);
    active.reverted_at = Set(Some(now));
    active.reverted_by = Set(Some(user_id));
    active
        .update(tx_repo.conn())
        .await
        .db_operation("mark image queue entry reverted")?;

    let notification_recipients =
        image_queue_notification::create_moderated_notification(
            tx_repo.conn(),
            user_id,
            id,
            ImageQueueModerationAction::Reverted,
        )
        .await?;

    tx_repo
        .commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;

    Ok(notification_recipients)
}

async fn lock_queue(
    tx_repo: &SeaOrmTxRepo,
    id: i32,
) -> Result<image_queue_entity::Model, Error> {
    let model = image_queue_entity::Entity::find_by_id(id)
        .lock_exclusive()
        .one(tx_repo.conn())
        .await
        .db_operation("lock image queue entry")?;

    model.ok_or(Error::NotFound)
}

async fn find_queue_target(
    tx_repo: &SeaOrmTxRepo,
    id: i32,
) -> Result<QueueTarget, Error> {
    let artist_queue = artist_image_queue_entity::Entity::find()
        .filter(artist_image_queue_entity::Column::QueueId.eq(id))
        .one(tx_repo.conn())
        .await
        .db_operation("find artist image queue target")?;

    let release_queue = release_image_queue_entity::Entity::find()
        .filter(release_image_queue_entity::Column::QueueId.eq(id))
        .one(tx_repo.conn())
        .await
        .db_operation("find release image queue target")?;

    match (artist_queue, release_queue) {
        (Some(artist_queue), None) => Ok(QueueTarget::Artist(artist_queue)),
        (None, Some(release_queue)) => Ok(QueueTarget::Release(release_queue)),
        (None, None) => Err(Error::UnknownTarget),
        (Some(_), Some(_)) => Err(Error::AmbiguousTarget),
    }
}
