use std::sync::Arc;

use axum::extract::State;
use entity::{language, role};
use itertools::Itertools;
use sea_orm::EntityTrait;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::Data;
use crate::dto::share::Language;
use crate::error::DbErrWrapper;
use crate::model::auth::UserRole;
use crate::state::AppState;

pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(language_list))
        .routes(routes!(user_roles))
}

#[utoipa::path(
    get,
    path = "/languages",
    responses(
        (status = 200, body = Data<Vec<Language>>),
        DbErrWrapper
    ),
)]
async fn language_list(
    State(state): State<Arc<AppState>>,
) -> Result<Data<Vec<Language>>, DbErrWrapper> {
    let res: Vec<Language> = language::Entity::find()
        .all(&state.database)
        .await?
        .iter()
        .map_into()
        .collect_vec();

    Ok(res.into())
}

#[utoipa::path(
    get,
    path = "/user_roles",
    responses(
        (status = 200, body = Data<Vec<Language>>),
        DbErrWrapper
    ),
)]
async fn user_roles(
    State(state): State<Arc<AppState>>,
) -> Result<Data<Vec<UserRole>>, DbErrWrapper> {
    Ok(role::Entity::find()
        .all(&state.database)
        .await?
        .iter()
        .map_into()
        .collect_vec()
        .into())
}
