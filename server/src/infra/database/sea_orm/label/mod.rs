use entity::{
    label, label_founder, label_founder_history, label_history,
    label_localized_name, label_localized_name_history,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, DatabaseTransaction, DbErr, EntityTrait, IntoActiveValue,
};
use snafu::ResultExt;

use crate::domain::Connection;
use crate::domain::label::{NewLabel, TxRepo};
use crate::domain::shared::NewLocalizedName;

mod impls;

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(
        &self,
        data: &NewLabel,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let label = save_label_and_link_relations(data, self.conn())
            .await
            .boxed()?;

        Ok(label.id)
    }

    async fn create_history(
        &self,
        data: &NewLabel,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        save_label_history_and_link_relations(data, self.conn())
            .await
            .map(|x| x.id)
            .boxed()
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        impls::apply_update(correction, self.conn()).await.boxed()
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
