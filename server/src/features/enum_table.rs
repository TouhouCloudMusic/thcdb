use axum::extract::State;
use entity::{language, role};
use itertools::Itertools;
use sea_orm::EntityTrait;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::model::UserRoleEnum;
use crate::domain::shared::Language;
use crate::infra::error::Error;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(language_list)).routes(routes!(user_roles))
        })
        .finish()
}

data! {
    DataVecLanguage, Vec<Language>
    DataVecUserRole, Vec<UserRoleEnum>
}

#[utoipa::path(
    get,
    path = "/languages",
    responses(
        (status = 200, body = DataVecLanguage),
    ),
)]
async fn language_list(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<Language>>, Error> {
    let res: Vec<Language> = language::Entity::find()
        .all(&state.database)
        .await?
        .into_iter()
        .map(Into::into)
        .collect();

    Ok(res.into())
}

#[utoipa::path(
    get,
    path = "/user-roles",
    responses(
        (status = 200, body = DataVecUserRole),
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
