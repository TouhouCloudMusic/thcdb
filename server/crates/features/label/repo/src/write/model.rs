use domain::shared::{
    DateWithPrecision, EntityIdent, HttpUrl, NewLocalizedName,
};
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct NewLabel {
    pub name: EntityIdent,
    pub founded_date: Option<DateWithPrecision>,
    pub dissolved_date: Option<DateWithPrecision>,
    pub founders: Option<Vec<i32>>,
    pub localized_names: Option<Vec<NewLocalizedName>>,
    pub links: Option<Vec<HttpUrl>>,
}
