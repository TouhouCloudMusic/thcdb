use axum::extract::State;
use entity::{language, role};
use itertools::Itertools;
use sea_orm::EntityTrait;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::Data;
use crate::domain::model::auth::UserRoleEnum;
use crate::dto::share::Language;
use crate::error::InternalError;
use crate::state::ArcAppState;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(language_list))
        .routes(routes!(user_roles))
}

super::data! {
    DataVecLanguage, Vec<Language>
    DataVecUserRole, Vec<UserRoleEnum>
}

#[utoipa::path(
    get,
    path = "/languages",
    responses(
        (status = 200, body = DataVecLanguage),
        InternalError
    ),
)]
async fn language_list(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<Language>>, InternalError> {
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
        (status = 200, body = DataVecUserRole),
        InternalError
    ),
)]
async fn user_roles(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<UserRoleEnum>>, InternalError> {
    Ok(role::Entity::find()
        .all(&state.database)
        .await?
        .iter()
        .map_into()
        .collect_vec()
        .into())
}
