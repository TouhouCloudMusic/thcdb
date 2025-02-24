use chrono::NaiveDate as Date;
use entity::sea_orm_active_enums::DatePrecision;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::correction;
use super::share::{AlternativeName, AlternativeNameResponse};

#[derive(ToSchema, Deserialize)]
pub struct EventCorrection {
    pub name: String,
    pub short_description: String,
    pub description: String,
    pub start_date: Option<Date>,
    pub start_date_precision: Option<DatePrecision>,
    pub end_date: Option<Date>,
    pub end_date_precision: Option<DatePrecision>,

    pub alternative_names: Vec<AlternativeName>,

    pub correction_metadata: correction::Metadata,
}

#[derive(ToSchema, Serialize)]
pub struct EventResponse {
    pub id: i32,
    pub name: String,
    pub short_description: String,
    pub description: String,
    pub start_date: Option<(Date, DatePrecision)>,
    pub end_date: Option<(Date, DatePrecision)>,

    pub alternative_names: Vec<AlternativeNameResponse>,
}

mod impls {
    use macros::impl_from;
    use sea_orm::ActiveValue::NotSet;
    use sea_orm::IntoActiveValue;

    use super::*;

    impl_from!(
        EventCorrection
            > [entity::event::ActiveModel, entity::event_history::ActiveModel] {
                name,
                short_description,
                description,
                start_date,
                start_date_precision,
                end_date,
                end_date_precision,
                : id NotSet
            },
        IntoActiveValue::into_active_value,
    );
}
