use entity::enums::EntityType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::{
    DateWithPrecision, EntityIdent, LocalizedName, NewLocalizedName,
};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Label {
    pub id: i32,
    pub name: String,
    pub founded_date: Option<DateWithPrecision>,
    pub dissolved_date: Option<DateWithPrecision>,
    pub founders: Vec<i32>,
    pub localized_names: Vec<LocalizedName>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SimpleLabel {
    pub id: i32,
    pub name: String,
}

#[derive(Deserialize, ToSchema)]
pub struct NewLabel {
    pub name: EntityIdent,
    pub founded_date: Option<DateWithPrecision>,
    pub dissolved_date: Option<DateWithPrecision>,
    pub founders: Option<Vec<i32>>,
    pub localized_names: Option<Vec<NewLocalizedName>>,
}

impl CorrectionEntity for NewLabel {
    fn entity_type() -> EntityType {
        EntityType::Label
    }
}
