use std::collections::HashMap;

use entity::user;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait, QueryFilter,
};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, DerivePartialModel, Serialize, ToSchema)]
#[sea_orm(entity = "user::Entity", from_query_result)]
pub struct UserSummary {
    pub id: i32,
    pub name: String,
}

impl UserSummary {
    #[must_use]
    pub fn unknown(user_id: i32) -> Self {
        Self {
            id: user_id,
            name: "Unknown".to_string(),
        }
    }
}

/// Missing user IDs are omitted from the returned map.
pub async fn load_users(
    conn: &impl ConnectionTrait,
    user_ids: impl IntoIterator<Item = i32>,
) -> Result<HashMap<i32, UserSummary>, DatabaseError> {
    let user_ids = user_ids.into_iter().collect::<Vec<_>>();
    if user_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let users = user::Entity::find()
        .filter(user::Column::Id.is_in(user_ids))
        .into_partial_model::<UserSummary>()
        .all(conn)
        .await
        .db_operation("load users")?;

    Ok(users.into_iter().map(|user| (user.id, user)).collect())
}
