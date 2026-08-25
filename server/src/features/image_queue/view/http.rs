use axum::extract::{Path, Query, State};
use axum::response::{IntoResponse, Response};
use domain::shared::CursorResponse;
use entity::image_queue as image_queue_entity;
use entity::sea_orm_active_enums::ImageQueueStatus;
use serde::Serialize;
use user_core::load_users;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, UserFilter};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::features::image_queue::shared::UserSummary;
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::Data;

const TAG: &str = "Image Queue";

data! {
    DataPaginatedUserImageQueueItem, CursorResponse<UserImageQueueItem>
}

#[derive(Serialize, ToSchema)]
struct UserImageQueueItem {
    id: i32,
    image_id: Option<i32>,
    status: ImageQueueStatus,
    created_at: chrono::DateTime<chrono::FixedOffset>,
    handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    handled_by: Option<UserSummary>,
    reverted_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    reverted_by: Option<UserSummary>,
}

impl UserImageQueueItem {
    const fn new(
        model: &image_queue_entity::Model,
        handled_by: Option<UserSummary>,
        reverted_by: Option<UserSummary>,
    ) -> Self {
        Self {
            id: model.id,
            image_id: model.image_id,
            status: model.status,
            created_at: model.created_at,
            handled_at: model.handled_at,
            handled_by,
            reverted_at: model.reverted_at,
            reverted_by,
        }
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(profile_image_queue_with_name)))
        .with_private(|r| r.routes(routes!(profile_image_queue)))
        .finish()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile/image-queue",
    params(PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedUserImageQueueItem),
    ),
)]
async fn profile_image_queue(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<CursorResponse<UserImageQueueItem>>, Response> {
    load_user_image_queue(&repo, UserFilter::Id(user.id), pagination).await
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile/{name}/image-queue",
    params(PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedUserImageQueueItem),
    ),
)]
async fn profile_image_queue_with_name(
    Path(name): Path<String>,
    State(repo): State<state::SeaOrmRepository>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<CursorResponse<UserImageQueueItem>>, Response> {
    load_user_image_queue(&repo, UserFilter::Name(name), pagination).await
}

async fn load_user_image_queue(
    repo: &state::SeaOrmRepository,
    filter: UserFilter,
    pagination: PaginationQuery,
) -> Result<Data<CursorResponse<UserImageQueueItem>>, Response> {
    let paginated =
        repo::find_by_user(repo, filter, pagination.limit(), pagination.cursor)
            .await
            .map_err(IntoResponse::into_response)?;

    let user_ids = paginated
        .items
        .iter()
        .flat_map(|model| [model.handled_by, model.reverted_by])
        .flatten()
        .collect::<Vec<_>>();
    let users = load_users(&repo.conn, user_ids)
        .await
        .db_operation("load image queue users")
        .map_err(IntoResponse::into_response)?;

    let items: Vec<UserImageQueueItem> = paginated
        .items
        .into_iter()
        .map(|model| {
            let resolve_user = |user_id| {
                users
                    .get(&user_id)
                    .cloned()
                    .unwrap_or_else(|| UserSummary::unknown(user_id))
            };
            let handled_by = model.handled_by.map(resolve_user);
            let reverted_by = model.reverted_by.map(resolve_user);

            UserImageQueueItem::new(&model, handled_by, reverted_by)
        })
        .collect();

    Ok(Data::from(CursorResponse {
        items,
        next_cursor: paginated.next_cursor,
    }))
}
