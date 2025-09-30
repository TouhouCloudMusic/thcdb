use entity::enums::EntityType;
use garde::Validate;
use serde::Deserialize;
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::{DateWithPrecision, EntityIdent, Location};

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
