use entity::enums::EntityType;
use serde::Deserialize;
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::{DateWithPrecision, EntityIdent, Location};

#[derive(Deserialize, ToSchema)]
pub struct NewEvent {
    pub name: EntityIdent,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub location: Option<Location>,
    pub start_date: Option<DateWithPrecision>,
    pub end_date: Option<DateWithPrecision>,
    pub alternative_names: Option<Vec<String>>,
}

impl CorrectionEntity for NewEvent {
    fn entity_type() -> EntityType {
        EntityType::Event
    }
}
