use domain::shared::CursorResponse;
use entity::sea_orm_active_enums::ImageQueueStatus;
use entity::{
    artist_image as artist_image_entity,
    artist_image_queue as artist_image_queue_entity, image as image_entity,
    image_queue as image_queue_entity, release_image as release_image_entity,
    release_image_queue as release_image_queue_entity,
};
use infra_db::{SeaOrmRepository, SeaOrmTxRepo};
use sea_orm::ActiveValue::Set;
use sea_orm::sea_query::{Expr, Query, SimpleExpr};
use sea_orm::{
    ColumnTrait, EntityTrait, FromQueryResult, JoinType, QueryFilter,
    QueryOrder, QuerySelect, QueryTrait, RelationTrait,
};

use super::ImageQueueType;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

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

pub enum QueueTarget {
    Artist(artist_image_queue_entity::Model),
    Release(release_image_queue_entity::Model),
}

#[infra_db::observe("image_queue.manage.find_pending")]
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
        .db_context("find pending image queue entries")?;

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

#[infra_db::observe("image_queue.manage.find_detail")]
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
        .db_context("find image queue entry detail")?
    else {
        return Ok(None);
    };

    let image = match queue.image_id {
        Some(image_id) => image_entity::Entity::find_by_id(image_id)
            .one(&repo.conn)
            .await
            .db_context("find queued image")?,
        None => None,
    };

    let artist = artist_image_queue_entity::Entity::find()
        .filter(artist_image_queue_entity::Column::QueueId.eq(id))
        .one(&repo.conn)
        .await
        .db_context("find artist image queue target")?;

    let release = release_image_queue_entity::Entity::find()
        .filter(release_image_queue_entity::Column::QueueId.eq(id))
        .one(&repo.conn)
        .await
        .db_context("find release image queue target")?;

    Ok(Some(ImageQueueDetailModels {
        queue,
        previous_id,
        next_id,
        image,
        artist,
        release,
    }))
}

#[infra_db::observe("image_queue.manage.publish_image")]
pub async fn publish_image(
    tx_repo: &SeaOrmTxRepo,
    target: QueueTarget,
    image_id: i32,
) -> Result<(), DatabaseError> {
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
            .db_context("publish artist image queue entry")?;
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
            .db_context("publish release image queue entry")?;
        }
    }

    Ok(())
}

#[infra_db::observe("image_queue.manage.delete_published_image")]
pub async fn delete_published_image(
    tx_repo: &SeaOrmTxRepo,
    target: QueueTarget,
    image_id: i32,
) -> Result<u64, DatabaseError> {
    let result = match target {
        QueueTarget::Artist(target) => {
            artist_image_entity::Entity::delete_many()
                .filter(
                    artist_image_entity::Column::ArtistId.eq(target.artist_id),
                )
                .filter(artist_image_entity::Column::ImageId.eq(image_id))
                .filter(artist_image_entity::Column::Type.eq(target.r#type))
                .exec(tx_repo.conn())
                .await
                .db_context("delete published artist image queue entry")?
        }
        QueueTarget::Release(target) => {
            release_image_entity::Entity::delete_many()
                .filter(
                    release_image_entity::Column::ReleaseId
                        .eq(target.release_id),
                )
                .filter(release_image_entity::Column::ImageId.eq(image_id))
                .filter(release_image_entity::Column::Type.eq(target.r#type))
                .exec(tx_repo.conn())
                .await
                .db_context("delete published release image queue entry")?
        }
    };

    Ok(result.rows_affected)
}

#[infra_db::observe("image_queue.manage.lock_queue")]
pub async fn lock_queue(
    tx_repo: &SeaOrmTxRepo,
    id: i32,
) -> Result<Option<image_queue_entity::Model>, DatabaseError> {
    let model = image_queue_entity::Entity::find_by_id(id)
        .lock_exclusive()
        .one(tx_repo.conn())
        .await?;
    Ok(model)
}

#[infra_db::observe("image_queue.manage.find_queue_targets")]
pub async fn find_queue_targets(
    tx_repo: &SeaOrmTxRepo,
    id: i32,
) -> Result<
    (
        Option<artist_image_queue_entity::Model>,
        Option<release_image_queue_entity::Model>,
    ),
    DatabaseError,
> {
    let artist_queue = artist_image_queue_entity::Entity::find()
        .filter(artist_image_queue_entity::Column::QueueId.eq(id))
        .one(tx_repo.conn())
        .await
        .db_context("find artist image queue target")?;

    let release_queue = release_image_queue_entity::Entity::find()
        .filter(release_image_queue_entity::Column::QueueId.eq(id))
        .one(tx_repo.conn())
        .await
        .db_context("find release image queue target")?;

    Ok((artist_queue, release_queue))
}
