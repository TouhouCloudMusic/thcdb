use std::collections::BTreeSet;

mod repo;
mod service;

use auth_core::permission::Permission;
use axum::Json;
use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use domain::shared::PageResponse;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, authz, data};
use crate::features::auth::{EditableUserRole, UserRole};
use crate::infra::database::error::DatabaseError;
use crate::shared::error::{EntityNotFound, InternalError};
use crate::shared::http::PageQuery;
use crate::shared::http::api_response::Data;

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
    #[display("{_0}")]
    #[from]
    NotFound(#[error(source)] EntityNotFound),
}

impl From<infra_db::error::DatabaseError> for Error {
    fn from(source: infra_db::error::DatabaseError) -> Self {
        Self::Database(source.into())
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Authz(source) => source.into_response(),
            Error::Database(source) => source.into_response(),
            Error::Internal(source) => source.into_response(),
            Error::NotFound(source) => source.into_response(),
        }
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
    authz::ensure_permission(&repo.conn, user.id, Permission::ListUsers)
        .await?;

    let keyword = filter
        .keyword
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(str::to_lowercase);
    let page = repo::list_users(
        &repo.conn,
        keyword,
        pagination.offset(),
        u64::from(pagination.limit()),
    )
    .await?;

    let items = page
        .users
        .into_iter()
        .map(|(user, roles)| {
            Ok(UserSummary {
                id: user.id,
                name: user.name,
                roles: roles
                    .into_iter()
                    .map(UserRole::try_from)
                    .collect::<Result<_, _>>()?,
            })
        })
        .collect::<Result<Vec<_>, Error>>()?;

    Ok(Data::new(pagination.to_response(items, page.total_items)))
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
    State(app_state): State<ArcAppState>,
    Json(req): Json<SetUserRolesRequest>,
) -> Result<Data<Vec<UserRole>>, Error> {
    authz::ensure_permission(
        &app_state.sea_orm_repo.conn,
        actor.id,
        Permission::ManageUserRoles,
    )
    .await?;

    let service = service::Service {
        repo: app_state.sea_orm_repo.clone(),
        user_events: app_state.user_events.clone(),
    };
    let new_roles = service.set_user_roles(actor.id, id, &req.roles).await?;

    Ok(Data::new(new_roles))
}
