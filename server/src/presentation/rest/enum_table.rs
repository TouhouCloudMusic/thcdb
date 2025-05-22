use axum::extract::State;
use entity::{language, role};
use itertools::Itertools;
use sea_orm::EntityTrait;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::state::ArcAppState;
use crate::domain::model::auth::UserRoleEnum;
use crate::domain::share::model::Language;
use crate::infra::error::Error;
use crate::presentation::api_response::Data;

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
        Error
    ),
)]
async fn language_list(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<Language>>, Error> {
    let res: Vec<Language> = language::Entity::find()
        .all(&state.database)
        .await?
        .into_iter()
        .map_into()
        .collect();

    Ok(res.into())
}

#[utoipa::path(
    get,
    path = "/user_roles",
    responses(
        (status = 200, body = DataVecUserRole),
        Error
    ),
)]
async fn user_roles(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<UserRoleEnum>>, Error> {
    Ok(role::Entity::find()
        .all(&state.database)
        .await?
        .iter()
        .filter_map(|model| UserRoleEnum::try_from(model.id).ok())
        .collect_vec()
        .into())
}
