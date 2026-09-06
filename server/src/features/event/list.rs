use domain::shared::{DateWithPrecision, Location};
use entity::event;
use entity::sea_orm_active_enums::DatePrecision;
use sea_orm::{ConnectionTrait, DerivePartialModel, Select};
use serde::Serialize;
use utoipa::ToSchema;

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct EventListItem {
    pub id: i32,
    pub name: String,
    pub start_date: Option<DateWithPrecision>,
    pub end_date: Option<DateWithPrecision>,
    pub location: Location,
    pub short_description: String,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "event::Entity", from_query_result)]
pub(crate) struct EventRow {
    id: i32,
    name: String,
    short_description: String,
    start_date: Option<chrono::NaiveDate>,
    start_date_precision: DatePrecision,
    end_date: Option<chrono::NaiveDate>,
    end_date_precision: DatePrecision,
    location_country: Option<String>,
    location_province: Option<String>,
    location_city: Option<String>,
}

impl From<EventRow> for EventListItem {
    fn from(event: EventRow) -> Self {
        Self {
            id: event.id,
            name: event.name,
            start_date: DateWithPrecision::from_option(
                event.start_date,
                event.start_date_precision,
            ),
            end_date: DateWithPrecision::from_option(
                event.end_date,
                event.end_date_precision,
            ),
            location: Location {
                country: event.location_country,
                province: event.location_province,
                city: event.location_city,
            },
            short_description: event.short_description,
        }
    }
}

pub(crate) async fn load(
    select: Select<event::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<EventListItem>, DatabaseError> {
    select
        .into_partial_model::<EventRow>()
        .all(db)
        .await
        .db_operation("load event list items")
        .map(|events| events.into_iter().map(Into::into).collect())
}
