use entity::{event, event_alternative_name};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::domain::Connection;
use crate::domain::event::{AlternativeName, Event};
use crate::domain::shared::{DateWithPrecision, Location};

pub(super) async fn find_by_id<R>(
    repo: &R,
    id: i32,
) -> Result<Option<Event>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    let select = event::Entity::find().filter(event::Column::Id.eq(id));

    find_many_impl(select, repo.conn())
        .await
        .map(|mut events| events.pop())
}

pub(super) async fn find_by_keyword<R>(
    repo: &R,
    keyword: &str,
) -> Result<Vec<Event>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
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

    find_many_impl(selector, repo.conn()).await
}

async fn find_many_impl(
    selector: sea_orm::Select<event::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Event>, sea_orm::DbErr> {
    let events = selector.all(db).await?;

    let alt_names =
        events.load_many(event_alternative_name::Entity, db).await?;

    Ok(izip!(events, alt_names)
        .map(|(event, alt_name)| Event {
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
        })
        .collect())
}
