use chrono::NaiveDate;
use entity::sea_orm_active_enums::DatePrecision;
use entity::{label, label_history};
use macros::impl_from;
use sea_orm::ActiveValue::NotSet;
use sea_orm::IntoActiveValue;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub use super::artist::NewLocalizedName;
use super::correction::Metadata;
use super::share::SimpleLocalizedName;

#[derive(ToSchema, Serialize)]
#[schema(
    as = Label
)]
pub struct LabelResponse {
    pub id: i32,
    pub name: String,
    pub founded_date: Option<(NaiveDate, DatePrecision)>,
    pub dissolved_date: Option<(NaiveDate, DatePrecision)>,

    pub founders: Vec<i32>,
    pub localized_names: Vec<SimpleLocalizedName>,
}

#[derive(ToSchema, Deserialize)]
pub struct NewLabel {
    pub name: String,
    pub founded_date: Option<NaiveDate>,
    pub founded_date_precision: Option<DatePrecision>,
    pub dissolved_date: Option<NaiveDate>,
    pub dissolved_date_precision: Option<DatePrecision>,

    pub localized_names: Vec<NewLocalizedName>,
    pub founders: Vec<i32>,

    pub correction_metadata: Metadata,
}

impl_from!(
    NewLabel >
    [label::ActiveModel, label_history::ActiveModel]{
        name,
        founded_date,
        founded_date_precision,
        dissolved_date,
        dissolved_date_precision,
        : id NotSet,
    },
    IntoActiveValue::into_active_value
);
