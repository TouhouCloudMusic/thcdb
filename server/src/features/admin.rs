use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use chrono::Utc;
use entity::{user, user_role, user_role_change_audit};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::sea_query::{ExprTrait, Func};
use sea_orm::{
    ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, authz, data};
use crate::domain::model::{
    AdminUserRead, AdminWrite, EditableUserRole, UserRole, UserRoleEnum,
};
use crate::domain::shared::PageResponse;
use crate::infra::error::Error as InfraError;
use crate::shared::http::api_response::Data;
use crate::shared::http::{PageQuery, api_response};

const TAG: &str = "Admin";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(admin_users))
                .routes(routes!(set_user_roles))
        })
        .finish()
}

#[derive(Serialize, ToSchema)]
pub struct UserSummary {
    pub id: i32,
    pub name: String,
    pub roles: Vec<UserRole>,
}

#[derive(Deserialize, IntoParams)]
pub struct AdminUsersFilter {
    pub keyword: Option<String>,
}

data! {
    DataPageUserSummary, PageResponse<UserSummary>
    DataUserRoles, Vec<UserRole>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/admin/users",
    params(
        AdminUsersFilter,
        PageQuery
    ),
    responses(
        (status = 200, body = DataPageUserSummary),
    ),
)]
async fn admin_users(
    CurrentUser(user): CurrentUser,
    Query(filter): Query<AdminUsersFilter>,
    Query(pagination): Query<PageQuery>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<PageResponse<UserSummary>>, axum::response::Response> {
    authz::ensure_permission::<AdminUserRead>(&repo.conn, user.id).await?;

    let keyword = filter
        .keyword
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(str::to_lowercase);
    let mut select = user::Entity::find();

    if let Some(keyword) = keyword {
        let pattern = format!("%{keyword}%");
        select = select
            .filter(Func::lower(user::Column::Name.into_expr()).like(pattern));
    }

    let page = pagination.page();
    let page_size = pagination.limit();
    let total_items = select
        .clone()
        .count(&repo.conn)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;
    let total_pages = if total_items == 0 {
        0
    } else {
        let pages = total_items.div_ceil(u64::from(page_size));
        u32::try_from(pages).unwrap_or(u32::MAX)
    };
    let offset =
        u64::from(page.saturating_sub(1)).saturating_mul(u64::from(page_size));

    let models = select
        .order_by_asc(user::Column::Id)
        .offset(offset)
        .limit(u64::from(page_size))
        .find_with_related(user_role::Entity)
        .all(&repo.conn)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    let items = models
        .into_iter()
        .map(|(user, roles)| -> Result<UserSummary, sea_orm::DbErr> {
            let roles = roles
                .into_iter()
                .map(UserRole::try_from)
                .collect::<Result<Vec<_>, _>>()?;

            Ok(UserSummary {
                id: user.id,
                name: user.name,
                roles,
            })
        })
        .collect::<Result<Vec<_>, sea_orm::DbErr>>()
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    Ok(Data::new(PageResponse {
        items,
        page,
        page_size,
        total_items,
        total_pages,
    }))
}

#[derive(Deserialize, ToSchema)]
pub struct SetUserRolesRequest {
    pub roles: Vec<EditableUserRole>,
}

#[utoipa::path(
    put,
    tag = TAG,
    path = "/admin/user/{id}/roles",
    request_body = SetUserRolesRequest,
    responses(
        (status = 200, body = DataUserRoles),
    ),
)]
async fn set_user_roles(
    CurrentUser(actor): CurrentUser,
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
    Json(req): Json<SetUserRolesRequest>,
) -> Result<Data<Vec<UserRole>>, axum::response::Response> {
    authz::ensure_permission::<AdminWrite>(&repo.conn, actor.id).await?;

    let tx_repo = repo
        .begin_tx()
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    let target_user = user::Entity::find_by_id(id)
        .one(tx_repo.conn())
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    if target_user.is_none() {
        return Err(api_response::Error::from_err_and_code(
            "User not found",
            StatusCode::NOT_FOUND,
        )
        .into_response());
    }

    let old_roles = user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(id))
        .all(tx_repo.conn())
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?
        .into_iter()
        .map(UserRole::try_from)
        .collect::<Result<Vec<_>, _>>()
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.eq(id))
        .filter(
            user_role::Column::RoleId.is_in(EditableUserRole::all_role_ids()),
        )
        .exec(tx_repo.conn())
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    let new_role_models = req
        .roles
        .iter()
        .copied()
        .map(|role| user_role::ActiveModel {
            user_id: Set(id),
            role_id: Set(UserRoleEnum::from(role).into()),
        })
        .collect_vec();

    if !new_role_models.is_empty() {
        user_role::Entity::insert_many(new_role_models)
            .exec(tx_repo.conn())
            .await
            .map_err(InfraError::from)
            .map_err(IntoResponse::into_response)?;
    }

    let new_roles = user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(id))
        .all(tx_repo.conn())
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?
        .into_iter()
        .map(UserRole::try_from)
        .collect::<Result<Vec<_>, _>>()
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    let old_role_names = old_roles.iter().map(|r| r.name.clone()).collect_vec();
    let new_role_names =
        new_roles.iter().map(|role| role.name.clone()).collect();

    user_role_change_audit::Entity::insert(
        user_role_change_audit::ActiveModel {
            id: NotSet,
            actor_user_id: Set(actor.id),
            target_user_id: Set(id),
            old_roles: Set(old_role_names),
            new_roles: Set(new_role_names),
            created_at: Set(Utc::now().into()),
        },
    )
    .exec(tx_repo.conn())
    .await
    .map_err(InfraError::from)
    .map_err(IntoResponse::into_response)?;

    tx_repo
        .commit()
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    Ok(Data::new(new_roles))
}
