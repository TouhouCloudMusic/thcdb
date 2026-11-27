use entity::credit_role::Model as DbCreditRole;
use macros::AutoMapper;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(AutoMapper, Clone, Debug, Serialize, ToSchema)]
#[mapper(from(DbCreditRole))]
pub struct CreditRoleSummary {
    pub id: i32,
    pub name: String,
    pub short_description: String,
}

#[derive(AutoMapper, Clone, Debug, Serialize, ToSchema)]
#[mapper(from(DbCreditRole))]
pub struct CreditRole {
    pub id: i32,
    pub name: String,
    pub short_description: String,
    pub description: String,
}
