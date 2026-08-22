use domain::shared::NewLocalizedName;
use entity::{
    correction_revision, label, label_founder, label_founder_history,
    label_history, label_localized_name, label_localized_name_history,
};
use infra_db::SeaOrmTxRepo;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    IntoActiveValue, ModelTrait, QueryFilter, QueryOrder,
};

use crate::features::label::model::NewLabel;
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewLabel,
) -> Result<i32, DatabaseError> {
    save_label_and_link_relations(data, repo.conn())
        .await
        .map(|label| label.id)
        .db_operation("create label")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewLabel,
) -> Result<i32, DatabaseError> {
    save_label_history_and_link_relations(data, repo.conn())
        .await
        .map(|label| label.id)
        .db_operation("create label history")
}

async fn save_label_and_link_relations(
    data: &NewLabel,
    conn: &impl ConnectionTrait,
) -> Result<label::Model, DbErr> {
    let label = label::ActiveModel::from(data).insert(conn).await?;

    if let Some(founders) = &data.founders {
        create_founders(label.id, founders, conn).await?;
    }

    if let Some(names) = &data.localized_names {
        create_localized_names(label.id, names, conn).await?;
    }

    Ok(label)
}

async fn save_label_history_and_link_relations(
    data: &NewLabel,
    conn: &impl ConnectionTrait,
) -> Result<label_history::Model, DbErr> {
    let history = label_history::ActiveModel::from(data).insert(conn).await?;

    if let Some(founders) = &data.founders {
        create_founder_histories(history.id, founders, conn).await?;
    }

    if let Some(names) = &data.localized_names {
        create_localized_name_histories(history.id, names, conn).await?;
    }

    Ok(history)
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

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    conn: &impl ConnectionTrait,
) -> Result<(), DatabaseError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(conn)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction.id,
        })?;

    let history = label_history::Entity::find_by_id(revision.entity_history_id)
        .one(conn)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "label history",
            id: revision.entity_history_id,
        })?;

    let active_model = label::ActiveModel {
        id: Set(correction.entity_id),
        name: Set(history.name),
        founded_date: Set(history.founded_date),
        founded_date_precision: Set(history.founded_date_precision),
        dissolved_date: Set(history.dissolved_date),
        dissolved_date_precision: Set(history.dissolved_date_precision),
    };

    active_model.update(conn).await?;
    update_founders(correction.entity_id, revision.entity_history_id, conn)
        .await?;
    update_localized_names(
        correction.entity_id,
        revision.entity_history_id,
        conn,
    )
    .await?;

    Ok(())
}

async fn update_founders(
    label_id: i32,
    history_id: i32,
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    label_founder::Entity::delete_many()
        .filter(label_founder::Column::LabelId.eq(label_id))
        .exec(conn)
        .await?;

    let founders = label_founder_history::Entity::find()
        .filter(label_founder_history::Column::HistoryId.eq(history_id))
        .all(conn)
        .await?;

    if founders.is_empty() {
        return Ok(());
    }

    let founder_ids = founders
        .iter()
        .map(|founder| founder.artist_id)
        .collect::<Vec<_>>();
    create_founders(label_id, &founder_ids, conn).await?;

    Ok(())
}

async fn update_localized_names(
    label_id: i32,
    history_id: i32,
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    label_localized_name::Entity::delete_many()
        .filter(label_localized_name::Column::LabelId.eq(label_id))
        .exec(conn)
        .await?;

    let names = label_localized_name_history::Entity::find()
        .filter(label_localized_name_history::Column::HistoryId.eq(history_id))
        .all(conn)
        .await?;

    if names.is_empty() {
        return Ok(());
    }

    let names = names
        .iter()
        .map(|name| NewLocalizedName {
            language_id: name.language_id,
            name: name.name.clone(),
        })
        .collect::<Vec<_>>();
    create_localized_names(label_id, &names, conn).await?;

    Ok(())
}
