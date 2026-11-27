use domain::shared::{HttpUrl, NewLocalizedName};
use entity::{
    label, label_founder, label_founder_history, label_history, label_link,
    label_link_history, label_localized_name, label_localized_name_history,
};
use infra_db::DatabaseTransaction;
use infra_db::error::DatabaseError;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DbErr, EntityTrait, IntoActiveValue,
};
use sea_query::OnConflict;

mod model;

pub use model::NewLabel;

#[infra_db::observe("label.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    data: &NewLabel,
) -> Result<i32, DatabaseError> {
    Ok(save_label_and_link_relations(data, tx)
        .await
        .map(|label| label.id)?)
}

#[infra_db::observe("label.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    data: &NewLabel,
) -> Result<i32, DatabaseError> {
    Ok(save_label_history_and_link_relations(data, tx)
        .await
        .map(|label| label.id)?)
}

async fn save_label_and_link_relations(
    data: &NewLabel,
    conn: &impl ConnectionTrait,
) -> Result<label::Model, DbErr> {
    infra_db::trace("label.insert_with_relations", async {
        let label = label::ActiveModel::from(data).insert(conn).await?;

        if let Some(founders) = &data.founders {
            create_founders(label.id, founders, conn).await?;
        }

        if let Some(names) = &data.localized_names {
            create_localized_names(label.id, names, conn).await?;
        }
        create_links(label.id, data.links.as_deref(), conn).await?;

        Ok(label)
    })
    .await
}

async fn save_label_history_and_link_relations(
    data: &NewLabel,
    conn: &impl ConnectionTrait,
) -> Result<label_history::Model, DbErr> {
    infra_db::trace("label.insert_history_with_relations", async {
        let history =
            label_history::ActiveModel::from(data).insert(conn).await?;

        if let Some(founders) = &data.founders {
            create_founder_histories(history.id, founders, conn).await?;
        }

        if let Some(names) = &data.localized_names {
            create_localized_name_histories(history.id, names, conn).await?;
        }
        create_link_histories(history.id, data.links.as_deref(), conn).await?;

        Ok(history)
    })
    .await
}

impl From<&NewLabel> for label::ActiveModel {
    fn from(data: &NewLabel) -> Self {
        Self {
            id: NotSet,
            name: data.name.to_string().into_active_value(),
            founded_date: data
                .founded_date
                .map(|d| d.value)
                .into_active_value(),
            founded_date_precision: data
                .founded_date
                .map(|d| d.precision)
                .into_active_value(),
            dissolved_date: data
                .dissolved_date
                .map(|d| d.value)
                .into_active_value(),
            dissolved_date_precision: data
                .dissolved_date
                .map(|d| d.precision)
                .into_active_value(),
        }
    }
}

impl From<&NewLabel> for label_history::ActiveModel {
    fn from(data: &NewLabel) -> Self {
        Self {
            id: NotSet,
            name: data.name.to_string().into_active_value(),
            founded_date: data
                .founded_date
                .map(|d| d.value)
                .into_active_value(),
            founded_date_precision: data
                .founded_date
                .map(|d| d.precision)
                .into_active_value(),
            dissolved_date: data
                .dissolved_date
                .map(|d| d.value)
                .into_active_value(),
            dissolved_date_precision: data
                .dissolved_date
                .map(|d| d.precision)
                .into_active_value(),
        }
    }
}

async fn create_founders(
    label_id: i32,
    founders: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if founders.is_empty() {
        return Ok(());
    }

    let models = founders
        .iter()
        .map(|founder_id| label_founder::ActiveModel {
            label_id: Set(label_id),
            artist_id: Set(*founder_id),
        });

    label_founder::Entity::insert_many(models)
        .exec(conn)
        .await?;

    Ok(())
}

async fn create_founder_histories(
    history_id: i32,
    founders: &[i32],
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if founders.is_empty() {
        return Ok(());
    }

    let models =
        founders
            .iter()
            .map(|founder_id| label_founder_history::ActiveModel {
                history_id: Set(history_id),
                artist_id: Set(*founder_id),
            });

    label_founder_history::Entity::insert_many(models)
        .exec(conn)
        .await?;

    Ok(())
}

async fn create_localized_names(
    label_id: i32,
    names: &[NewLocalizedName],
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if names.is_empty() {
        return Ok(());
    }

    let models = names.iter().map(|name| label_localized_name::ActiveModel {
        label_id: Set(label_id),
        language_id: Set(name.language_id),
        name: Set(name.name.clone()),
    });

    label_localized_name::Entity::insert_many(models)
        .exec(conn)
        .await?;

    Ok(())
}

async fn create_localized_name_histories(
    history_id: i32,
    names: &[NewLocalizedName],
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if names.is_empty() {
        return Ok(());
    }

    let models =
        names
            .iter()
            .map(|name| label_localized_name_history::ActiveModel {
                history_id: Set(history_id),
                language_id: Set(name.language_id),
                name: Set(name.name.clone()),
            });

    label_localized_name_history::Entity::insert_many(models)
        .exec(conn)
        .await?;

    Ok(())
}

async fn create_links(
    label_id: i32,
    links: Option<&[HttpUrl]>,
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    let Some(links) = links.filter(|links| !links.is_empty()) else {
        return Ok(());
    };

    let models = links.iter().map(|link| label_link::ActiveModel {
        id: NotSet,
        label_id: Set(label_id),
        url: Set(link.to_string()),
    });

    label_link::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                label_link::Column::LabelId,
                label_link::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(conn)
        .await?;

    Ok(())
}

async fn create_link_histories(
    history_id: i32,
    links: Option<&[HttpUrl]>,
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    let Some(links) = links.filter(|links| !links.is_empty()) else {
        return Ok(());
    };

    let models = links.iter().map(|link| label_link_history::ActiveModel {
        id: NotSet,
        history_id: Set(history_id),
        url: Set(link.to_string()),
    });

    label_link_history::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                label_link_history::Column::HistoryId,
                label_link_history::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(conn)
        .await?;

    Ok(())
}
