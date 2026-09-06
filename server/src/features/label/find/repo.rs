use domain::shared::{DateWithPrecision, LocalizedName};
use entity::{
    label, label_founder, label_link, label_localized_name, language,
};
use infra_db::SeaOrmRepository;
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::features::label::model::Label;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;

pub(super) async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Label>, DatabaseError> {
    let select = label::Entity::find().filter(label::Column::Id.eq(id));

    find_many_impl(select, &repo.conn)
        .await
        .map(|mut labels| labels.pop())
        .db_operation("find label by id")
}

pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
    keyword: &str,
) -> Result<Vec<Label>, DatabaseError> {
    let search_term = Func::lower(keyword);

    let select = label::Entity::find()
        .filter(
            Func::lower(label::Column::Name.into_expr())
                .binary(PgBinOper::Similarity, search_term.clone()),
        )
        .order_by_asc(
            Func::lower(label::Column::Name.into_expr())
                .binary(PgBinOper::SimilarityDistance, search_term),
        );

    find_many_impl(select, &repo.conn)
        .await
        .db_operation("find labels by keyword")
}

pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: super::LabelFilter,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<Label>, DatabaseError> {
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
        .await
        .db_operation("explore labels");
    }

    let select = filter.into_select();
    utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        label::Column::Id,
        |select| find_many_impl(select, &repo.conn),
    )
    .await
    .db_operation("explore labels")
}

async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: super::LabelFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<Label>, DatabaseError> {
    use entity::enums::EntityType;

    use crate::shared::http::SortDirection;

    let entity_ids =
        crate::infra::database::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Label,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await
        .db_operation("list correction-sorted label ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let mut select = label::Entity::find()
        .filter(label::Column::Id.is_in(entity_ids.clone()));

    if let Some(founded_date_from) = filter.founded_date_from {
        select =
            select.filter(label::Column::FoundedDate.gte(founded_date_from));
    }
    if let Some(founded_date_to) = filter.founded_date_to {
        select = select.filter(label::Column::FoundedDate.lte(founded_date_to));
    }
    if let Some(is_dissolved) = filter.is_dissolved {
        if is_dissolved {
            select = select.filter(label::Column::DissolvedDate.is_not_null());
        } else {
            select = select.filter(label::Column::DissolvedDate.is_null());
        }
    }

    let mut labels = find_many_impl(select, &repo.conn).await?;

    labels = crate::infra::database::utils::sort_by_id_list(
        labels,
        &entity_ids,
        |label| label.id,
    );

    Ok(utils::page_from_items(labels, &pagination))
}

async fn find_many_impl(
    select: sea_orm::Select<label::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Label>, DatabaseError> {
    let labels = select.all(db).await.db_operation("load labels")?;

    let founders = labels
        .load_many(label_founder::Entity, db)
        .await
        .db_operation("load label founders")?;

    let localized_names = labels
        .load_many(label_localized_name::Entity, db)
        .await
        .db_operation("load label localized names")?;

    let links = labels
        .load_many(label_link::Entity, db)
        .await
        .db_operation("load label links")?;

    let langs = language::Entity::find()
        .filter(
            language::Column::Id.is_in(
                localized_names
                    .iter()
                    .flat_map(|x| x.iter().map(|x| x.language_id)),
            ),
        )
        .all(db)
        .await
        .db_operation("load label localized name languages")?;

    Ok(izip!(labels, founders, localized_names, links)
        .map(|(label, founders, names, links)| {
            let founded_date =
                match (label.founded_date, label.founded_date_precision) {
                    (Some(date), precision) => Some(DateWithPrecision {
                        value: date,
                        precision,
                    }),
                    _ => None,
                };

            let dissolved_date =
                match (label.dissolved_date, label.dissolved_date_precision) {
                    (Some(date), precision) => Some(DateWithPrecision {
                        value: date,
                        precision,
                    }),
                    _ => None,
                };

            let founders = founders.into_iter().map(|x| x.artist_id).collect();

            let localized_names = names
                .into_iter()
                .map(|model| LocalizedName {
                    name: model.name,
                    language: langs
                        .iter()
                        .find(|y| y.id == model.language_id)
                        .unwrap()
                        .clone()
                        .into(),
                })
                .collect();

            Label {
                id: label.id,
                name: label.name,
                founded_date,
                dissolved_date,
                founders,
                localized_names,
                links: links.into_iter().map(|link| link.url).collect(),
            }
        })
        .collect_vec())
}
