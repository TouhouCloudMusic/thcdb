use std::collections::HashMap;

use axum::response::IntoResponse;
use entity::user as user_entity;
use sea_orm::{ColumnTrait, DerivePartialModel, EntityTrait, QueryFilter};
use serde::Serialize;
use utoipa::ToSchema;

use crate::adapter::inbound::rest::state;
use crate::infra::error::Error as InfraError;

#[derive(Clone, Serialize, ToSchema, DerivePartialModel)]
#[sea_orm(entity = "user_entity::Entity", from_query_result)]
pub(crate) struct UserSummary {
    pub(crate) id: i32,
    pub(crate) name: String,
}

impl UserSummary {
    pub(crate) fn unknown(user_id: i32) -> Self {
        Self {
            id: user_id,
            name: "Unknown".to_string(),
        }
    }
}

pub(crate) async fn load_users(
    repo: &state::SeaOrmRepository,
    user_ids: Vec<i32>,
) -> Result<HashMap<i32, UserSummary>, axum::response::Response> {
    if user_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let users = user_entity::Entity::find()
        .filter(user_entity::Column::Id.is_in(user_ids))
        .into_partial_model::<UserSummary>()
        .all(&repo.conn)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    Ok(users.into_iter().map(|user| (user.id, user)).collect())
}
