use entity::{label, label_founder, label_localized_name, language};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::domain::Connection;
use crate::domain::label::Label;
use crate::domain::shared::{DateWithPrecision, LocalizedName};

pub(super) async fn find_by_id<R>(
    repo: &R,
    id: i32,
) -> Result<Option<Label>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    let select = label::Entity::find().filter(label::Column::Id.eq(id));

    find_many_impl(select, repo.conn())
        .await
        .map(|mut labels| labels.pop())
}

pub(super) async fn find_by_keyword<R>(
    repo: &R,
    keyword: &str,
) -> Result<Vec<Label>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
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

    find_many_impl(select, repo.conn()).await
}

async fn find_many_impl(
    select: sea_orm::Select<label::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Label>, sea_orm::DbErr> {
    let labels = select.all(db).await?;

    let founders = labels.load_many(label_founder::Entity, db).await?;

    let localized_names =
        labels.load_many(label_localized_name::Entity, db).await?;

    let langs = language::Entity::find()
        .filter(
            language::Column::Id.is_in(
                localized_names
                    .iter()
                    .flat_map(|x| x.iter().map(|x| x.language_id)),
            ),
        )
        .all(db)
        .await?;

    Ok(izip!(labels, founders, localized_names)
        .map(|(label, founders, names)| {
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
            }
        })
        .collect_vec())
}
