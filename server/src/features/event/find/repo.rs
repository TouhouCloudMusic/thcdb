use entity::{event, event_alternative_name};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::features::event::model::{AlternativeName, Event};
use crate::domain::shared::{DateWithPrecision, Location};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::database::sea_orm::utils;

pub(super) async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Event>, DbErr> {
    let select = event::Entity::find().filter(event::Column::Id.eq(id));

    find_many_impl(select, &repo.conn)
        .await
        .map(|mut events| events.pop())
}

pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
    keyword: &str,
) -> Result<Vec<Event>, DbErr> {
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

    find_many_impl(selector, &repo.conn).await
}

pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: super::EventFilter,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Event>, DbErr> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        return find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await;
    }

    let select = filter.into_select();
    utils::find_many_paginated(
        select,
        pagination,
        event::Column::Id,
        |select| find_many_impl(select, &repo.conn),
        |event: &Event| event.id,
    )
    .await
}

async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: super::EventFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Event>, DbErr> {
    use entity::enums::EntityType;

    use crate::shared::http::SortDirection;

    let entity_ids =
        crate::infra::database::sea_orm::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Event,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await?;

    if entity_ids.is_empty() {
        return Ok(crate::domain::shared::Paginated::nothing());
    }

    let mut select = event::Entity::find()
        .filter(event::Column::Id.is_in(entity_ids.clone()));

    if let Some(start_date_from) = filter.start_date_from {
        select = select.filter(event::Column::StartDate.gte(start_date_from));
    }
    if let Some(start_date_to) = filter.start_date_to {
        select = select.filter(event::Column::StartDate.lte(start_date_to));
    }

    let mut events = find_many_impl(select, &repo.conn).await?;

    events = crate::infra::database::sea_orm::utils::sort_by_id_list(
        events,
        &entity_ids,
        |event| event.id,
    );

    Ok(utils::paginate_by_id(events, &pagination, |event| event.id))
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
