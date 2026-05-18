use domain::shared::{DateWithPrecision, EntityIdent, Location};
use entity::enums::EntityType;
use garde::Validate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;

#[derive(Validate, Deserialize, ToSchema)]
pub struct NewEvent {
    #[garde(skip)]
    pub name: EntityIdent,
    #[garde(skip)]
    pub short_description: Option<String>,
    #[garde(skip)]
    pub description: Option<String>,
    #[garde(skip)]
    pub location: Option<Location>,
    #[garde(skip)]
    pub start_date: Option<DateWithPrecision>,
    #[garde(custom(validate_end_date(self.start_date.as_ref())))]
    pub end_date: Option<DateWithPrecision>,
    #[garde(skip)]
    pub alternative_names: Option<Vec<String>>,
}

impl CorrectionEntity for NewEvent {
    fn entity_type() -> EntityType {
        EntityType::Event
    }
}

fn validate_end_date(
    start: Option<&DateWithPrecision>,
) -> impl FnOnce(&Option<DateWithPrecision>, &()) -> garde::Result + '_ {
    move |end, ()| match (start, end.as_ref()) {
        (_, None) => Ok(()),
        (Some(start), Some(end)) => {
            if end.value > start.value {
                Ok(())
            } else {
                Err(garde::Error::new("end_date must be later than start_date"))
            }
        }
        (None, Some(_)) => Err(garde::Error::new(
            "end_date requires start_date when provided",
        )),
    }
}

#[serde_with::apply(
    Vec      => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option   => #[serde(skip_serializing_if = "Option::is_none")],
    Location => #[serde(skip_serializing_if = "Location::is_empty")]
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Event {
    pub id: i32,
    pub name: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub short_description: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub description: String,
    pub location: Location,
    pub start_date: Option<DateWithPrecision>,
    pub end_date: Option<DateWithPrecision>,
    pub alternative_names: Vec<AlternativeName>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct AlternativeName {
    pub id: i32,
    pub name: String,
}
