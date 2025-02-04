use macros::impl_from;
use sea_orm::FromQueryResult;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, ToSchema, Serialize)]
pub struct CreditRole {
    pub id: i32,
    pub name: String,
}

impl_from!(entity::credit_role::Model > CreditRole { id, name });

#[derive(Clone, ToSchema, Serialize, Deserialize, FromQueryResult)]
pub struct Language {
    pub id: i32,
    pub code: String,
    pub name: String,
}

impl_from!(entity::language::Model > Language { id, code, name });

#[derive(ToSchema, Serialize)]
pub struct LocalizedTitle {
    pub language: Language,
    pub title: String,
}
