use entity::credit_role::Model as DbCreditRole;
use macros::AutoMapper;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(AutoMapper, Clone, Debug, PartialEq, Eq, Serialize, ToSchema)]
#[mapper(from(DbCreditRole))]
pub struct CreditRoleRef {
    pub id: i32,
    pub name: String,
}
