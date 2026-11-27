use chrono::NaiveDate;
use domain::shared::{DateWithPrecision, Location};
use entity::event;
use entity::sea_orm_active_enums::DatePrecision;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait, QueryFilter,
};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct EventListItem {
    pub id: i32,
    pub name: String,
    pub start_date: Option<DateWithPrecision>,
    pub end_date: Option<DateWithPrecision>,
    pub location: Location,
    pub short_description: String,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "event::Entity", from_query_result)]
pub struct EventRow {
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

#[infra_db::observe("event.find_list_items")]
pub async fn find_list_items(
    db: &impl ConnectionTrait,
    entity_ids: &[i32],
    start_date_from: Option<NaiveDate>,
    start_date_to: Option<NaiveDate>,
) -> Result<Vec<EventListItem>, DatabaseError> {
    if entity_ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut select = event::Entity::find()
        .filter(event::Column::Id.is_in(entity_ids.iter().copied()));
    if let Some(start_date_from) = start_date_from {
        select = select.filter(event::Column::StartDate.gte(start_date_from));
    }
    if let Some(start_date_to) = start_date_to {
        select = select.filter(event::Column::StartDate.lte(start_date_to));
    }

    let events = select
        .into_partial_model::<EventRow>()
        .all(db)
        .await
        .db_context("load event list items")?;
    Ok(events.into_iter().map(Into::into).collect())
}
