use serde::Serialize;
use utoipa::ToSchema;

use crate::domain::shared::model::{DateWithPrecision, Location};

#[serde_with::apply(
    Vec      => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option   => #[serde(skip_serializing_if = "Option::is_none")],
    Location => #[serde(skip_serializing_if = "Location::is_empty")],
    String   => #[serde(skip_serializing_if = "String::is_empty")]
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Event {
    pub id: i32,
    pub name: String,
    pub short_description: String,
    pub description: String,
    pub location: Location,
    pub start_date: Option<DateWithPrecision>,
    pub end_date: Option<DateWithPrecision>,
    pub alternative_names: Vec<AlternativeName>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SimpleEvent {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct AlternativeName {
    pub id: i32,
    pub name: String,
}
