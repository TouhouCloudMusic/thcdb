use axum::extract::{FromRef, Path, Query, State};
use domain::shared::CursorResponse;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::Error;
use super::model::{
    HandleImageQueueQuery, ImageQueueDetail, ImageQueueFilterQuery,
    PendingImageQueueItem,
};
use super::service::Service;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::features::notification;
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::{Data, Message};

const TAG: &str = "Image Queue";

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(
            input.sea_orm_repo.clone(),
            notification::Service::new(
                input.sea_orm_repo.clone(),
                input.notification_hub.clone(),
            ),
        )
    }
}

data! {
    DataPaginatedPendingImageQueueItem, CursorResponse<PendingImageQueueItem>
    DataPendingImageQueueCount, u64
    DataImageQueueDetail, ImageQueueDetail
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
    State(service): State<Service>,
    Query(pagination): Query<PaginationQuery>,
    Query(filter): Query<ImageQueueFilterQuery>,
) -> Result<Data<CursorResponse<PendingImageQueueItem>>, Error> {
    Ok(Data::from(
        service.pending_image_queue(pagination, filter).await?,
    ))
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
    State(service): State<Service>,
) -> Result<Data<u64>, Error> {
    Ok(Data::from(service.pending_image_queue_count().await?))
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
    State(service): State<Service>,
) -> Result<Data<ImageQueueDetail>, Error> {
    Ok(Data::from(service.image_queue_detail(user.id, id).await?))
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
    State(service): State<Service>,
) -> Result<Message, Error> {
    service
        .handle_image_queue(user.id, id, query.method)
        .await?;

    Ok(Message::ok())
}
