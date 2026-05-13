use axum::extract::State;
use entity::{language, role, song_relation_type};
use itertools::Itertools;
use libfp::FunctorExt;
use sea_orm::{EntityTrait, QueryOrder};
use strum::IntoEnumIterator;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::model::{EditableUserRole, UserRoleEnum};
use crate::domain::shared::Language;
use crate::domain::song::SongRelationType;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::http::api_response::Data;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(language_list))
                .routes(routes!(user_roles))
                .routes(routes!(editable_user_roles))
                .routes(routes!(song_relation_types))
        })
        .finish()
}

data! {
    DataVecLanguage, Vec<Language>
    DataVecSongRelationType, Vec<SongRelationType>
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
async fn language_list(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<Language>>, DatabaseError> {
    let res: Vec<Language> = language::Entity::find()
        .all(&state.database)
        .await
        .db_operation("list languages")?
        .fmap_into();

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
) -> Result<Data<Vec<UserRoleEnum>>, DatabaseError> {
    Ok(role::Entity::find()
        .all(&state.database)
        .await
        .db_operation("list user roles")?
        .iter()
        .filter_map(|model| UserRoleEnum::try_from(model.id).ok())
        .collect_vec()
        .into())
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

#[utoipa::path(
    get,
    path = "/song-relation-types",
    responses(
        (status = 200, body = DataVecSongRelationType),
    ),
)]
async fn song_relation_types(
    State(state): State<ArcAppState>,
) -> Result<Data<Vec<SongRelationType>>, DatabaseError> {
    Ok(song_relation_type::Entity::find()
        .order_by_asc(song_relation_type::Column::Id)
        .all(&state.database)
        .await
        .db_operation("list song relation types")?
        .into_iter()
        .map(Into::into)
        .collect_vec()
        .into())
}
