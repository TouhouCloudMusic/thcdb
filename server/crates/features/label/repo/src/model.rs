use domain::shared::{DateWithPrecision, LocalizedName, SimpleArtist};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Label {
    pub id: i32,
    pub name: String,
    pub founded_date: Option<DateWithPrecision>,
    pub dissolved_date: Option<DateWithPrecision>,
    pub founders: Vec<SimpleArtist>,
    pub localized_names: Vec<LocalizedName>,
    pub links: Vec<String>,
}
