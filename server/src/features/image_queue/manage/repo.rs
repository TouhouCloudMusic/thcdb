use chrono::Utc;
use entity::sea_orm_active_enums::ImageQueueStatus;
use entity::{
    artist_image as artist_image_entity,
    artist_image_queue as artist_image_queue_entity, image as image_entity,
    image_queue as image_queue_entity, release_image as release_image_entity,
    release_image_queue as release_image_queue_entity,
};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, JoinType,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, QueryTrait,
    RelationTrait,
};

use super::{Error, ImageQueueType};
use crate::domain::shared::CursorResponse;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{SeaOrmRepository, SeaOrmTxRepo};

pub struct ImageQueueDetailModels {
    pub queue: image_queue_entity::Model,
    pub image: Option<image_entity::Model>,
    pub artist: Option<artist_image_queue_entity::Model>,
    pub release: Option<release_image_queue_entity::Model>,
}

enum QueueTarget {
    Artist(artist_image_queue_entity::Model),
    Release(release_image_queue_entity::Model),
}

pub(crate) struct HandledImageQueue {
    pub created_by: i32,
    pub image_id: i32,
}

impl TryFrom<&image_queue_entity::Model> for HandledImageQueue {
    type Error = Error;

    fn try_from(
        model: &image_queue_entity::Model,
    ) -> Result<Self, Self::Error> {
        Ok(Self {
            created_by: model.created_by,
            image_id: model.image_id.ok_or(Error::InvalidEntry)?,
        })
    }
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
    let model = image_queue_entity::Entity::find_by_id(id)
        .one(&repo.conn)
        .await
        .db_operation("find image queue entry detail")?;

    let Some(queue) = model else {
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
        image,
        artist,
        release,
    }))
}

pub async fn approve(
    repo: &SeaOrmRepository,
    user_id: i32,
    id: i32,
) -> Result<HandledImageQueue, Error> {
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin approve image queue transaction")?;

    let model = find_queue(&tx_repo, id).await?;

    if model.status != ImageQueueStatus::Pending {
        return Err(Error::InvalidOperation);
    }

    let handled = HandledImageQueue::try_from(&model)?;
    let image_id = handled.image_id;
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

    tx_repo.commit().await?;

    Ok(handled)
}

pub async fn reject(
    repo: &SeaOrmRepository,
    user_id: i32,
    id: i32,
) -> Result<HandledImageQueue, Error> {
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin reject image queue transaction")?;

    let model = find_queue(&tx_repo, id).await?;

    if model.status != ImageQueueStatus::Pending {
        return Err(Error::InvalidOperation);
    }

    let handled = HandledImageQueue::try_from(&model)?;
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

    tx_repo.commit().await?;

    Ok(handled)
}

pub async fn revert(
    repo: &SeaOrmRepository,
    user_id: i32,
    id: i32,
) -> Result<HandledImageQueue, Error> {
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin revert image queue transaction")?;

    let model = find_queue(&tx_repo, id).await?;

    if model.status != ImageQueueStatus::Approved {
        return Err(Error::InvalidOperation);
    }

    let handled = HandledImageQueue::try_from(&model)?;
    let image_id = handled.image_id;
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
                return Err(Error::PublishedNotFound);
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
                return Err(Error::PublishedNotFound);
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

    tx_repo.commit().await?;

    Ok(handled)
}

async fn find_queue(
    tx_repo: &SeaOrmTxRepo,
    id: i32,
) -> Result<image_queue_entity::Model, Error> {
    let model = image_queue_entity::Entity::find_by_id(id)
        .one(tx_repo.conn())
        .await
        .db_operation("find image queue entry")?;

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
