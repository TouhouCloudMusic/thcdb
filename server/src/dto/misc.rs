use sea_orm::FromQueryResult;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, ToSchema, Serialize, Deserialize, FromQueryResult)]
pub struct Language {
    pub id: i32,
    pub code: String,
    pub name: String,
}

impl From<entity::language::Model> for Language {
    fn from(value: entity::language::Model) -> Self {
        Self {
            id: value.id,
            code: value.code,
            name: value.name,
        }
    }
}
