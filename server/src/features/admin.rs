use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use chrono::Utc;
use entity::{user, user_role, user_role_change_audit};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::sea_query::{ExprTrait, Func};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{
    AppRouter, CurrentUser, api_response, authz, data,
};
use crate::domain::model::{AdminUserRead, AdminWrite, UserRole, UserRoleEnum};
use crate::domain::shared::{DEFAULT_LIMIT, MAX_LIMIT, Paginated};
use crate::infra::error::Error as InfraError;

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
pub struct AdminUsersQuery {
    pub limit: Option<u32>,
    pub cursor: Option<i32>,
    pub keyword: Option<String>,
}

data! {
    DataPaginatedUserSummary, Paginated<UserSummary>
    DataUserRoles, Vec<UserRole>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/admin/users",
    params(
        AdminUsersQuery
    ),
    responses(
        (status = 200, body = DataPaginatedUserSummary),
    ),
)]
async fn admin_users(
    CurrentUser(user): CurrentUser,
    Query(query): Query<AdminUsersQuery>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<Paginated<UserSummary>>, axum::response::Response> {
    authz::ensure_permission::<AdminUserRead>(&repo.conn, user.id).await?;

    let limit = query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    let cursor = query.cursor.unwrap_or(0).max(0);
    let keyword = query
        .keyword
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_lowercase);

    let mut select = user::Entity::find()
        .order_by_asc(user::Column::Id)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit.saturating_add(1)));

    if let Some(keyword) = keyword {
        let pattern = format!("%{keyword}%");
        select = select
            .filter(Func::lower(user::Column::Name.into_expr()).like(pattern));
    }

    let mut models = select
        .find_with_related(user_role::Entity)
        .all(&repo.conn)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    let next_cursor = if models.len() > limit as usize {
        models.pop();
        Some(cursor.saturating_add(i32::try_from(limit).unwrap_or(i32::MAX)))
    } else {
        None
    };

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

    Ok(Data::new(Paginated { items, next_cursor }))
}

#[derive(Deserialize, ToSchema)]
pub struct SetUserRolesRequest {
    pub roles: Vec<String>,
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

    if req.roles.is_empty() {
        return Err(api_response::Error::from_err_and_code(
            "roles must not be empty",
            StatusCode::BAD_REQUEST,
        )
        .into_response());
    }

    let mut new_roles = Vec::<UserRoleEnum>::new();
    for raw in req.roles {
        let raw = raw.trim();
        if raw.is_empty() {
            return Err(api_response::Error::from_err_and_code(
                "role must not be empty",
                StatusCode::BAD_REQUEST,
            )
            .into_response());
        }

        let role = match raw.to_ascii_lowercase().as_str() {
            "admin" => UserRoleEnum::Admin,
            "moderator" => UserRoleEnum::Moderator,
            "user" => UserRoleEnum::User,
            _ => {
                return Err(api_response::Error::from_err_and_code(
                    format!("Unknown role: {raw}"),
                    StatusCode::BAD_REQUEST,
                )
                .into_response());
            }
        };

        if !new_roles.contains(&role) {
            new_roles.push(role);
        }
    }

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
        .exec(tx_repo.conn())
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    let new_role_models = new_roles
        .iter()
        .copied()
        .map(|role| user_role::ActiveModel {
            user_id: Set(id),
            role_id: Set(role.into()),
        })
        .collect_vec();

    user_role::Entity::insert_many(new_role_models)
        .exec(tx_repo.conn())
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    let old_role_names = old_roles.iter().map(|r| r.name.clone()).collect_vec();
    let new_role_names = new_roles.iter().map(ToString::to_string).collect();

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

    Ok(Data::new(
        new_roles.into_iter().map(UserRole::from).collect(),
    ))
}
