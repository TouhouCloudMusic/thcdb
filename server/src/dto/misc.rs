use sea_orm::FromQueryResult;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, ToSchema, Serialize)]
pub struct CreditRole {
    pub id: i32,
    pub name: String,
}

impl From<entity::credit_role::Model> for CreditRole {
    fn from(value: entity::credit_role::Model) -> Self {
        Self {
            id: value.id,
            name: value.name,
        }
    }
}

impl From<&entity::credit_role::Model> for CreditRole {
    fn from(value: &entity::credit_role::Model) -> Self {
        Self {
            id: value.id,
            name: value.name.clone(),
        }
    }
}

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

impl From<&entity::language::Model> for Language {
    fn from(value: &entity::language::Model) -> Self {
        Self {
            id: value.id,
            code: value.code.clone(),
            name: value.name.clone(),
        }
    }
}

#[derive(ToSchema, Serialize)]
pub struct LocalizedTitle {
    pub language: Language,
    pub title: String,
}
