use entity::credit_role::Model as DbCreditRole;
use macros::AutoMapper;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(AutoMapper, Clone, Debug, Serialize, ToSchema)]
#[mapper(from(DbCreditRole))]
pub struct CreditRoleRef {
    pub id: i32,
    pub name: String,
}

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

use entity::enums::EntityType;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::EntityIdent;

#[derive(Deserialize, ToSchema)]
pub struct NewCreditRole {
    pub name: EntityIdent,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub super_roles: Option<Vec<i32>>,
}

impl CorrectionEntity for NewCreditRole {
    fn entity_type() -> EntityType {
        EntityType::CreditRole
    }
}
