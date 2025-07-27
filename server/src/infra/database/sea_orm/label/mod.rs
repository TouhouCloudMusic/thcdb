use entity::{
    label, label_founder, label_founder_history, label_history,
    label_localized_name, label_localized_name_history, language,
};
use itertools::{Itertools, izip};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, IntoActiveValue, LoaderTrait, QueryFilter, QueryOrder,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::domain::label::model::{Label, NewLabel};
use crate::domain::label::{Repo, TxRepo};
use crate::domain::repository::Connection;
use crate::domain::shared::model::{
    DateWithPrecision, LocalizedName, NewLocalizedName,
};

mod impls;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_by_id(&self, id: i32) -> Result<Option<Label>, Self::Error> {
        let select = label::Entity::find().filter(label::Column::Id.eq(id));
        find_many_impl(select, self.conn())
            .await
            .map(|x| x.into_iter().next())
    }

    async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Label>, Self::Error> {
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
        find_many_impl(select, self.conn()).await
    }
}

async fn find_many_impl(
    select: sea_orm::Select<label::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Label>, DbErr> {
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

    let res = izip!(labels, founders, localized_names)
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
        .collect_vec();

    Ok(res)
}

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(&self, data: &NewLabel) -> Result<i32, Self::Error> {
        let label = save_label_and_link_relations(data, self.conn()).await?;

        Ok(label.id)
    }

    async fn create_history(
        &self,
        data: &NewLabel,
    ) -> Result<i32, Self::Error> {
        save_label_history_and_link_relations(data, self.conn())
            .await
            .map(|x| x.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error> {
        impls::apply_update(correction, self.conn()).await
    }
}

async fn save_label_and_link_relations(
    data: &NewLabel,
    tx: &DatabaseTransaction,
) -> Result<label::Model, DbErr> {
    let (founded_date, founded_date_precision) = data
        .founded_date
        .map_or((None, None), |d| (Some(d.value), Some(d.precision)));

    let (dissolved_date, dissolved_date_precision) = data
        .dissolved_date
        .map_or((None, None), |d| (Some(d.value), Some(d.precision)));

    let label_model = label::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        founded_date: founded_date.into_active_value(),
        founded_date_precision: founded_date_precision.into_active_value(),
        dissolved_date: dissolved_date.into_active_value(),
        dissolved_date_precision: dissolved_date_precision.into_active_value(),
    };

    let label = label_model.insert(tx).await?;

    if let Some(founders) = &data.founders {
        create_founders(label.id, founders, tx).await?;
    }

    if let Some(names) = &data.localized_names {
        create_localized_names(label.id, names, tx).await?;
    }

    Ok(label)
}

async fn save_label_history_and_link_relations(
    data: &NewLabel,
    tx: &DatabaseTransaction,
) -> Result<label_history::Model, DbErr> {
    let (founded_date, founded_date_precision) = data
        .founded_date
        .map_or((None, None), |d| (Some(d.value), Some(d.precision)));

    let (dissolved_date, dissolved_date_precision) = data
        .dissolved_date
        .map_or((None, None), |d| (Some(d.value), Some(d.precision)));

    let history_model = label_history::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        founded_date: founded_date.into_active_value(),
        founded_date_precision: founded_date_precision.into_active_value(),
        dissolved_date: dissolved_date.into_active_value(),
        dissolved_date_precision: dissolved_date_precision.into_active_value(),
    };

    let history = history_model.insert(tx).await?;

    if let Some(founders) = &data.founders {
        create_founder_histories(history.id, founders, tx).await?;
    }

    if let Some(names) = &data.localized_names {
        create_localized_name_histories(history.id, names, tx).await?;
    }

    Ok(history)
}

async fn create_founders(
    label_id: i32,
    founders: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if founders.is_empty() {
        return Ok(());
    }

    let active_models =
        founders
            .iter()
            .map(|founder_id| label_founder::ActiveModel {
                label_id: label_id.into_active_value(),
                artist_id: founder_id.into_active_value(),
            });

    label_founder::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_founder_histories(
    history_id: i32,
    founders: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if founders.is_empty() {
        return Ok(());
    }

    let active_models =
        founders
            .iter()
            .map(|founder_id| label_founder_history::ActiveModel {
                history_id: history_id.into_active_value(),
                artist_id: founder_id.into_active_value(),
            });

    label_founder_history::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_localized_names(
    label_id: i32,
    names: &[NewLocalizedName],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if names.is_empty() {
        return Ok(());
    }

    let active_models =
        names.iter().map(|name| label_localized_name::ActiveModel {
            label_id: Set(label_id),
            language_id: Set(name.language_id),
            name: Set(name.name.clone()),
        });

    label_localized_name::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_localized_name_histories(
    history_id: i32,
    names: &[NewLocalizedName],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if names.is_empty() {
        return Ok(());
    }

    let active_models =
        names
            .iter()
            .map(|name| label_localized_name_history::ActiveModel {
                history_id: Set(history_id),
                language_id: Set(name.language_id),
                name: Set(name.name.clone()),
            });

    label_localized_name_history::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}
