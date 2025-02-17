use axum::extract::State;
use entity::{language, role};
use itertools::Itertools;
use sea_orm::{DatabaseConnection, EntityTrait};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::Data;
use crate::dto::enums::UserRole;
use crate::dto::share::Language;
use crate::error::DbErrWrapper;
use crate::state::AppState;

pub fn router() -> OpenApiRouter<AppState> {
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
    State(db): State<DatabaseConnection>,
) -> Result<Data<Vec<Language>>, DbErrWrapper> {
    let res: Vec<Language> = language::Entity::find()
        .all(&db)
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
    State(db): State<DatabaseConnection>,
) -> Result<Data<Vec<UserRole>>, DbErrWrapper> {
    Ok(role::Entity::find()
        .all(&db)
        .await?
        .iter()
        .map_into()
        .collect_vec()
        .into())
}
