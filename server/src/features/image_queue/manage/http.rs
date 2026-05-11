use axum::extract::{Path, Query, State};
use entity::sea_orm_active_enums::{
    ArtistImageType, ImageQueueStatus, ReleaseImageType,
};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{ImageQueueType, repo};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, authz, data};
use crate::domain::model::ImageQueueManage;
use crate::domain::shared::CursorResponse;
use crate::features::image_queue::shared::{UserSummary, load_users};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::{AppError, Data, Message};

const TAG: &str = "Image Queue";

data! {
    DataPaginatedPendingImageQueueItem, CursorResponse<PendingImageQueueItem>
    DataPendingImageQueueCount, u64
    DataImageQueueDetail, ImageQueueDetail
}

#[derive(Debug, Clone, Deserialize, IntoParams)]
struct ImageQueueFilterQuery {
    r#type: Option<ImageQueueType>,
    status: Option<ImageQueueStatus>,
}

#[derive(Deserialize, ToSchema)]
pub(crate) enum HandleImageQueueMethod {
    Approve,
    Reject,
    Revert,
}

#[derive(IntoParams, Deserialize)]
struct HandleImageQueueQuery {
    method: HandleImageQueueMethod,
}

#[derive(Serialize, ToSchema)]
struct PendingImageQueueItem {
    id: i32,
    image_id: Option<i32>,
    status: ImageQueueStatus,
    created_at: chrono::DateTime<chrono::FixedOffset>,
    created_by: UserSummary,
}

#[derive(Serialize, ToSchema)]
struct ImageSummary {
    id: i32,
    filename: String,
    directory: String,
    uploaded_at: chrono::DateTime<chrono::FixedOffset>,
    uploaded_by: UserSummary,
}

#[derive(Serialize, ToSchema)]
struct ArtistImageQueueTarget {
    artist_id: i32,
    r#type: ArtistImageType,
}

#[derive(Serialize, ToSchema)]
struct ReleaseImageQueueTarget {
    release_id: i32,
    r#type: ReleaseImageType,
}

#[derive(Serialize, ToSchema)]
struct ImageQueueDetail {
    id: i32,
    image_id: Option<i32>,
    status: ImageQueueStatus,
    created_at: chrono::DateTime<chrono::FixedOffset>,
    created_by: UserSummary,
    handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    handled_by: Option<UserSummary>,
    reverted_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    reverted_by: Option<UserSummary>,
    image: Option<ImageSummary>,
    artist: Option<ArtistImageQueueTarget>,
    release: Option<ReleaseImageQueueTarget>,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(pending_image_queue))
                .routes(routes!(pending_image_queue_count))
                .routes(routes!(image_queue_detail))
                .routes(routes!(handle_image_queue))
        })
        .finish()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/image-queue",
    params(PaginationQuery, ImageQueueFilterQuery),
    responses(
        (status = 200, body = DataPaginatedPendingImageQueueItem),
    ),
)]
async fn pending_image_queue(
    CurrentUser(_user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Query(pagination): Query<PaginationQuery>,
    Query(filter): Query<ImageQueueFilterQuery>,
) -> Result<Data<CursorResponse<PendingImageQueueItem>>, AppError> {
    let limit = pagination.limit();
    let cursor = pagination.cursor;

    let paginated =
        repo::find_pending(&repo, limit, cursor, filter.status, filter.r#type)
            .await?;

    let user_ids = paginated
        .items
        .iter()
        .map(|model| model.created_by)
        .collect::<Vec<_>>();
    let users = load_users(&repo, user_ids).await?;

    let items =
        paginated
            .items
            .into_iter()
            .map(|model| PendingImageQueueItem {
                id: model.id,
                image_id: model.image_id,
                status: model.status,
                created_at: model.created_at,
                created_by: users
                    .get(&model.created_by)
                    .cloned()
                    .unwrap_or_else(|| UserSummary::unknown(model.created_by)),
            });
    let items = CursorResponse {
        items: items.collect(),
        next_cursor: paginated.next_cursor,
    };

    Ok(Data::from(items))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/image-queue/pending-count",
    responses(
        (status = 200, body = DataPendingImageQueueCount),
    ),
)]
async fn pending_image_queue_count(
    CurrentUser(_user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<u64>, AppError> {
    let count = repo::count_pending(&repo).await?;

    Ok(Data::from(count))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/image-queue/{id}",
    responses(
        (status = 200, body = DataImageQueueDetail),
    ),
)]
async fn image_queue_detail(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<ImageQueueDetail>, AppError> {
    let detail = repo::find_detail(&repo, id)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::not_found("Image queue entry not found"))?;

    if detail.queue.created_by != user.id {
        authz::ensure_permission::<ImageQueueManage>(&repo.conn, user.id)
            .await?;
    }

    let image = detail.image;

    let artist = detail.artist.map(|model| ArtistImageQueueTarget {
        artist_id: model.artist_id,
        r#type: model.r#type,
    });

    let release = detail.release.map(|model| ReleaseImageQueueTarget {
        release_id: model.release_id,
        r#type: model.r#type,
    });

    let queue = detail.queue;
    let user_ids = [
        Some(queue.created_by),
        queue.handled_by,
        queue.reverted_by,
        image.as_ref().map(|model| model.uploaded_by),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>();
    let users = load_users(&repo, user_ids).await?;

    let image = image.map(|image| ImageSummary {
        id: image.id,
        filename: image.filename,
        directory: image.directory,
        uploaded_at: image.uploaded_at,
        uploaded_by: users
            .get(&image.uploaded_by)
            .cloned()
            .unwrap_or_else(|| UserSummary::unknown(image.uploaded_by)),
    });

    Ok(Data::from(ImageQueueDetail {
        id: queue.id,
        image_id: queue.image_id,
        status: queue.status,
        created_at: queue.created_at,
        created_by: users
            .get(&queue.created_by)
            .cloned()
            .unwrap_or_else(|| UserSummary::unknown(queue.created_by)),
        handled_at: queue.handled_at,
        handled_by: queue.handled_by.map(|user_id| {
            users
                .get(&user_id)
                .cloned()
                .unwrap_or_else(|| UserSummary::unknown(user_id))
        }),
        reverted_at: queue.reverted_at,
        reverted_by: queue.reverted_by.map(|user_id| {
            users
                .get(&user_id)
                .cloned()
                .unwrap_or_else(|| UserSummary::unknown(user_id))
        }),
        image,
        artist,
        release,
    }))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/image-queue/{id}",
    params(
        HandleImageQueueQuery
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn handle_image_queue(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Query(query): Query<HandleImageQueueQuery>,
    State(repo): State<state::SeaOrmRepository>,
    State(notification): State<state::NotificationService>,
) -> Result<Message, AppError> {
    authz::ensure_permission::<ImageQueueManage>(&repo.conn, user.id).await?;

    let queue = entity::image_queue::Entity::find_by_id(id)
        .one(&repo.conn)
        .await
        .with_operation("find image queue entry before handling")?;

    let (created_by, image_id) = match queue {
        Some(model) => (model.created_by, model.image_id),
        None => return Err(super::Error::NotFound.into()),
    };

    let image_id = image_id.ok_or(super::Error::InvalidEntry)?;

    match query.method {
        HandleImageQueueMethod::Approve => {
            repo::approve(&repo, user.id, id).await?;

            notification
                .notify_image_status_best_effort(
                    created_by,
                    image_id,
                    crate::domain::model::NotificationKindEnum::ImageApproved,
                    Some("Your image was approved".to_owned()),
                )
                .await;

            Ok(Message::ok())
        }
        HandleImageQueueMethod::Reject => {
            repo::reject(&repo, user.id, id).await?;

            notification
                .notify_image_status_best_effort(
                    created_by,
                    image_id,
                    crate::domain::model::NotificationKindEnum::ImageRejected,
                    Some("Your image was rejected".to_owned()),
                )
                .await;

            Ok(Message::ok())
        }
        HandleImageQueueMethod::Revert => {
            repo::revert(&repo, user.id, id).await?;

            notification
                .notify_image_status_best_effort(
                    created_by,
                    image_id,
                    crate::domain::model::NotificationKindEnum::ImageReverted,
                    Some("Your image was reverted".to_owned()),
                )
                .await;

            Ok(Message::ok())
        }
    }
}
