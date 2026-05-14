use axum::extract::{Path, Query, State};
use entity::image_queue as image_queue_entity;
use entity::sea_orm_active_enums::ImageQueueStatus;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Serialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, authz, data};
use crate::domain::model::PermissionName;
use crate::domain::shared::CursorResponse;
use crate::features::image_queue::shared::{UserSummary, load_users};
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
        .with_private(|r| r.routes(routes!(user_image_queue)))
        .finish()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/user/{id}/image-queue",
    params(PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedUserImageQueueItem),
    ),
)]
async fn user_image_queue(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<CursorResponse<UserImageQueueItem>>, authz::Error> {
    if user.id != id {
        authz::ensure_permission(
            &repo.conn,
            user.id,
            PermissionName::ImageQueueManage,
        )
        .await?;
    }

    let limit = pagination.limit();

    let mut select = image_queue_entity::Entity::find()
        .filter(image_queue_entity::Column::CreatedBy.eq(id))
        .order_by_desc(image_queue_entity::Column::Id);

    if let Some(cursor) = pagination.cursor {
        select = select.filter(image_queue_entity::Column::Id.lt(cursor));
    }

    let mut models = select
        .limit(u64::from(limit) + 1)
        .all(&repo.conn)
        .await
        .db_operation("find user image queue")?;

    let has_next = models.len() > limit as usize;
    if has_next {
        models.truncate(limit as usize);
    }

    let next_cursor = if has_next {
        models.last().map(|m| m.id)
    } else {
        None
    };

    let user_ids = models
        .iter()
        .flat_map(|model| [model.handled_by, model.reverted_by])
        .flatten()
        .collect::<Vec<_>>();
    let users = load_users(&repo, user_ids).await?;

    let items: Vec<UserImageQueueItem> = models
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

    Ok(Data::from(CursorResponse { items, next_cursor }))
}
