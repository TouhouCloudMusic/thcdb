use axum::extract::State;
use domain::shared::Language;
use entity::{language, role};
use itertools::Itertools;
use libfp::FunctorExt;
use sea_orm::EntityTrait;
use strum::IntoEnumIterator;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::auth::{EditableUserRole, UserRoleEnum};
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseFailure, DatabaseResultExt,
};
use crate::shared::http::api_response::Data;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(language_list))
                .routes(routes!(user_roles))
                .routes(routes!(editable_user_roles))
        })
        .finish()
}

data! {
    DataVecLanguage, Vec<Language>
    DataVecUserRole, Vec<UserRoleEnum>
    DataVecEditableUserRole, Vec<EditableUserRole>
}

#[utoipa::path(
    get,
    path = "/languages",
    responses(
        (status = 200, body = DataVecLanguage),
    ),
)]
#[fastrace::trace(name = "enum_table.load_languages")]
async fn language_list(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<Language>>, DatabaseError> {
    let languages: Vec<Language> = language::Entity::find()
        .all(&state.database)
        .await
        .db_context("list languages")?
        .fmap_into();
    Ok(languages.into())
}

#[utoipa::path(
    get,
    path = "/user-roles",
    responses(
        (status = 200, body = DataVecUserRole),
    ),
)]
#[fastrace::trace(name = "enum_table.load_user_roles")]
async fn user_roles(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<UserRoleEnum>>, DatabaseError> {
    let roles = role::Entity::find()
        .all(&state.database)
        .await
        .db_context("list user roles")?
        .into_iter()
        .map(|model| {
            UserRoleEnum::try_from(model.id).map_err(|_| {
                DatabaseFailure::from(BrokenEntityReference {
                    entity: "role",
                    id: model.id,
                })
                .context("decode user role")
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(roles.into())
}

#[utoipa::path(
    get,
    path = "/editable-user-roles",
    responses(
        (status = 200, body = DataVecEditableUserRole),
    ),
)]
async fn editable_user_roles(
    State(_state): State<ArcAppState>,
) -> Data<Vec<EditableUserRole>> {
    EditableUserRole::iter().collect_vec().into()
}
