use std::collections::BTreeSet;

use axum::Json;
use axum::extract::{Path, Query, State};
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
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::InternalError;
use crate::shared::http::PageQuery;
use crate::shared::http::api_response::{AppError, Data};

const TAG: &str = "Admin";

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
enum Error {
    #[display("{_0}")]
    #[from]
    Authz(#[error(source)] authz::Error),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
    #[display("User not found")]
    UserNotFound,
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Authz(source) => source.into(),
            Error::Database(source) => source.into(),
            Error::Internal(source) => source.into(),
            Error::UserNotFound => AppError::not_found(err.to_string()),
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

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
) -> Result<Data<PageResponse<UserSummary>>, Error> {
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

    let total_items = select
        .clone()
        .count(&repo.conn)
        .await
        .db_operation("count admin users")?;

    let models = select
        .order_by_asc(user::Column::Id)
        .offset(pagination.offset())
        .limit(u64::from(pagination.limit()))
        .find_with_related(user_role::Entity)
        .all(&repo.conn)
        .await
        .db_operation("find admin users")?;

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
        .db_operation("build admin user roles")?;

    Ok(Data::new(pagination.to_response(items, total_items)))
}

#[derive(Deserialize, ToSchema)]
pub struct SetUserRolesRequest {
    pub roles: BTreeSet<EditableUserRole>,
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
) -> Result<Data<Vec<UserRole>>, Error> {
    authz::ensure_permission::<AdminWrite>(&repo.conn, actor.id).await?;

    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin set user roles transaction")?;

    let target_user = user::Entity::find_by_id(id)
        .one(tx_repo.conn())
        .await
        .db_operation("find user for role update")?;

    if target_user.is_none() {
        return Err(Error::UserNotFound);
    }

    let old_roles = user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(id))
        .all(tx_repo.conn())
        .await
        .db_operation("find old user roles")?
        .into_iter()
        .map(UserRole::try_from)
        .collect::<Result<Vec<_>, _>>()
        .db_operation("build old user roles")?;

    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.eq(id))
        .filter(
            user_role::Column::RoleId.is_in(EditableUserRole::all_role_ids()),
        )
        .exec(tx_repo.conn())
        .await
        .db_operation("delete old editable user roles")?;

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
            .db_operation("insert new user roles")?;
    }

    let new_roles = user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(id))
        .all(tx_repo.conn())
        .await
        .db_operation("find new user roles")?
        .into_iter()
        .map(UserRole::try_from)
        .collect::<Result<Vec<_>, _>>()
        .db_operation("build new user roles")?;

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
    .db_operation("insert user role change audit")?;

    tx_repo.commit().await?;

    Ok(Data::new(new_roles))
}
