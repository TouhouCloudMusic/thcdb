use domain::shared::{DateWithPrecision, Location};
use entity::{event, event_alternative_name, event_link};
use infra_db::SeaOrmRepository;
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::features::event::list::{self, EventListItem};
use crate::features::event::model::{AlternativeName, Event};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;

#[infra_db::observe("event.find_by_id")]
pub(super) async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Event>, DatabaseError> {
    let select = event::Entity::find().filter(event::Column::Id.eq(id));

    let mut events = find_many_impl(select, &repo.conn).await?;
    Ok(events.pop())
}

#[infra_db::observe("event.find_by_keyword")]
pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
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

    let items = find_many_impl(selector, &repo.conn).await?;
    Ok(items)
}

#[infra_db::observe("event.find_by_filter")]
pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: super::EventFilter,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<EventListItem>, DatabaseError> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        let page = find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await?;
        return Ok(page);
    }

    let select = filter.into_select();
    let page = utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        event::Column::Id,
        |select| list::load(select, &repo.conn),
    )
    .await?;
    Ok(page)
}

#[infra_db::observe("event.find_sorted_by_correction")]
async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: super::EventFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<EventListItem>, DatabaseError> {
    use entity::enums::EntityType;

    use crate::shared::http::SortDirection;

    let entity_ids =
        crate::infra::database::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Event,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await
        .db_context("list correction-sorted event ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let mut select = event::Entity::find()
        .filter(event::Column::Id.is_in(entity_ids.clone()));

    if let Some(start_date_from) = filter.start_date_from {
        select = select.filter(event::Column::StartDate.gte(start_date_from));
    }
    if let Some(start_date_to) = filter.start_date_to {
        select = select.filter(event::Column::StartDate.lte(start_date_to));
    }

    let mut events = list::load(select, &repo.conn).await?;

    events = crate::infra::database::utils::sort_by_id_list(
        events,
        &entity_ids,
        |event| event.id,
    );

    Ok(utils::page_from_items(events, &pagination))
}

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
