use std::collections::HashMap;

use artist_repo::ArtistReferenceRow;
use chrono::NaiveDate;
use domain::shared::{DateWithPrecision, LocalizedName, SimpleArtist};
use entity::{
    artist, label, label_founder, label_link, label_localized_name, language,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder, Select,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::model::Label;

pub fn list_select(
    entity_ids: Option<&[i32]>,
    founded_date_from: Option<NaiveDate>,
    founded_date_to: Option<NaiveDate>,
    is_dissolved: Option<bool>,
) -> Select<label::Entity> {
    let mut select = label::Entity::find();
    if let Some(entity_ids) = entity_ids {
        select =
            select.filter(label::Column::Id.is_in(entity_ids.iter().copied()));
    }
    if let Some(founded_date_from) = founded_date_from {
        select =
            select.filter(label::Column::FoundedDate.gte(founded_date_from));
    }
    if let Some(founded_date_to) = founded_date_to {
        select = select.filter(label::Column::FoundedDate.lte(founded_date_to));
    }
    if let Some(is_dissolved) = is_dissolved {
        if is_dissolved {
            select = select.filter(label::Column::DissolvedDate.is_not_null());
        } else {
            select = select.filter(label::Column::DissolvedDate.is_null());
        }
    }

    select
}

#[infra_db::observe("label.load_with_relations")]
async fn find_many_impl(
    select: sea_orm::Select<label::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Label>, DatabaseError> {
    let labels = select.all(db).await.db_context("load labels")?;

    let founders = labels
        .load_many(label_founder::Entity, db)
        .await
        .db_context("load label founders")?;

    let founders_by_id = artist::Entity::find()
        .filter(artist::Column::Id.is_in(founders.iter().flat_map(
            |founders| founders.iter().map(|founder| founder.artist_id),
        )))
        .into_partial_model::<ArtistReferenceRow>()
        .all(db)
        .await
        .db_context("load label founder names")?
        .into_iter()
        .map(|artist| (artist.id, SimpleArtist::from(artist)))
        .collect::<HashMap<_, _>>();

    let localized_names = labels
        .load_many(label_localized_name::Entity, db)
        .await
        .db_context("load label localized names")?;

    let links = labels
        .load_many(label_link::Entity, db)
        .await
        .db_context("load label links")?;

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
        .db_context("load label localized name languages")?;

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

            let founders = founders
                .into_iter()
                .map(|founder| founders_by_id[&founder.artist_id].clone())
                .collect();

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

#[infra_db::observe("label.find_by_id")]
pub async fn find_by_id(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<Label>, DatabaseError> {
    let select = label::Entity::find().filter(label::Column::Id.eq(id));

    let mut labels = find_many_impl(select, db).await?;
    Ok(labels.pop())
}

#[infra_db::observe("label.find_by_keyword")]
pub async fn find_by_keyword(
    db: &impl ConnectionTrait,
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

    Ok(find_many_impl(select, db).await?)
}
