use domain::shared::{DateWithPrecision, Location};
use entity::{event, event_alternative_name, event_link};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::{AlternativeName, Event};

#[infra_db::observe("event.load_with_relations")]
async fn find_many_impl(
    selector: sea_orm::Select<event::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Event>, DatabaseError> {
    let events = selector.all(db).await.db_context("load events")?;

    let alt_names = events
        .load_many(event_alternative_name::Entity, db)
        .await
        .db_context("load event alternative names")?;

    let links = events
        .load_many(event_link::Entity, db)
        .await
        .db_context("load event links")?;

    Ok(izip!(events, alt_names, links)
        .map(|(event, alt_name, links)| Event {
            id: event.id,
            name: event.name,
            short_description: event.short_description,
            description: event.description,
            location: Location {
                country: event.location_country,
                province: event.location_province,
                city: event.location_city,
            },
            start_date: match (event.start_date, event.start_date_precision) {
                (Some(date), precision) => Some(DateWithPrecision {
                    value: date,
                    precision,
                }),
                _ => None,
            },
            end_date: match (event.end_date, event.end_date_precision) {
                (Some(date), precision) => Some(DateWithPrecision {
                    value: date,
                    precision,
                }),
                _ => None,
            },
            alternative_names: alt_name
                .into_iter()
                .map(|name| AlternativeName {
                    id: name.id,
                    name: name.name,
                })
                .collect_vec(),
            links: links.into_iter().map(|link| link.url).collect(),
        })
        .collect())
}

#[infra_db::observe("event.find_by_id")]
pub async fn find_by_id(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<Event>, DatabaseError> {
    let select = event::Entity::find().filter(event::Column::Id.eq(id));

    let mut events = find_many_impl(select, db).await?;
    Ok(events.pop())
}

#[infra_db::observe("event.find_by_keyword")]
pub async fn find_by_keyword(
    db: &impl ConnectionTrait,
    keyword: &str,
) -> Result<Vec<Event>, DatabaseError> {
    let search_term = Func::lower(keyword);

    let selector = event::Entity::find()
        .filter(
            Func::lower(event::Column::Name.into_expr())
                .binary(PgBinOper::Similarity, search_term.clone()),
        )
        .order_by_asc(
            Func::lower(event::Column::Name.into_expr())
                .binary(PgBinOper::SimilarityDistance, search_term),
        );

    let items = find_many_impl(selector, db).await?;
    Ok(items)
}
