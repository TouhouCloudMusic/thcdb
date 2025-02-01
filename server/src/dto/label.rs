use chrono::NaiveDate;
use entity::sea_orm_active_enums::DatePrecision;
use entity::{label, label_history};
use sea_orm::ActiveValue::NotSet;
use sea_orm::IntoActiveValue;

pub use super::artist::NewLocalizedName;
use super::correction::Metadata;

pub struct NewLabel {
    pub name: String,
    pub localized_names: Vec<NewLocalizedName>,
    pub founded_date: Option<NaiveDate>,
    pub founded_date_precision: Option<DatePrecision>,
    pub dissolved_date: Option<NaiveDate>,
    pub dissolved_date_precision: Option<DatePrecision>,
    pub founders: Vec<i32>,
    pub correction_metadata: Metadata,
}

impl From<&NewLabel> for label::ActiveModel {
    fn from(value: &NewLabel) -> Self {
        Self {
            id: NotSet,
            name: value.name.clone().into_active_value(),
            founded_date: value.founded_date.into_active_value(),
            founded_date_precision: value
                .founded_date_precision
                .into_active_value(),
            dissolved_date: value.dissolved_date.into_active_value(),
            dissolved_date_precision: value
                .dissolved_date_precision
                .into_active_value(),
        }
    }
}

impl From<&NewLabel> for label_history::ActiveModel {
    fn from(value: &NewLabel) -> Self {
        Self {
            id: NotSet,
            name: value.name.clone().into_active_value(),
            founded_date: value.founded_date.into_active_value(),
            founded_date_precision: value
                .founded_date_precision
                .into_active_value(),
            dissolved_date: value.dissolved_date.into_active_value(),
            dissolved_date_precision: value
                .dissolved_date_precision
                .into_active_value(),
        }
    }
}
