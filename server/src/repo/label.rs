use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, EntityType,
};
use entity::{
    correction, correction_revision, label, label_founder,
    label_founder_history, label_history, label_localized_name,
    label_localized_name_history,
};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityName,
    EntityTrait, IntoActiveValue, ModelTrait, QueryFilter, QueryOrder,
};

use super::correction::user::utils::add_co_author_if_updater_not_author;
use crate::dto::label::{NewLabel, NewLocalizedName};
use crate::error::RepositoryError;
use crate::repo;

pub async fn create(
    data: NewLabel,
    tx: &DatabaseTransaction,
) -> Result<label::Model, DbErr> {
    let label = save_label_and_link_relations(&data, tx).await?;

    let history = save_label_history_and_link_relations(&data, tx).await?;

    let correction = repo::correction::create_self_approval()
        .author_id(data.correction_metadata.author_id)
        .entity_type(EntityType::Label)
        .entity_id(label.id)
        .db(tx)
        .call()
        .await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(data.correction_metadata.description.clone())
        .db(tx)
        .call()
        .await?;

    Ok(label)
}

pub async fn create_update_correction(
    label_id: i32,
    data: NewLabel,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let history = save_label_history_and_link_relations(&data, tx).await?;

    let correction = repo::correction::create()
        .author_id(data.correction_metadata.author_id)
        .entity_id(label_id)
        .entity_type(EntityType::Label)
        .status(CorrectionStatus::Pending)
        .r#type(CorrectionType::Update)
        .db(tx)
        .call()
        .await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(data.correction_metadata.description.clone())
        .db(tx)
        .call()
        .await?;

    Ok(())
}

pub async fn update_update_correction(
    correction: correction::Model,
    data: NewLabel,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    add_co_author_if_updater_not_author(
        correction.id,
        data.correction_metadata.author_id,
        tx,
    )
    .await?;

    let history = save_label_history_and_link_relations(&data, tx).await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(data.correction_metadata.description.clone())
        .db(tx)
        .call()
        .await?;

    Ok(())
}

pub(super) async fn apply_correction(
    correction: correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: correction_revision::Entity.table_name(),
        })?;

    let history = label_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: label_history::Entity.table_name(),
        })?;

    let label_id = correction.entity_id;
    update_founders(label_id, history.id, tx).await?;
    update_localized_names(label_id, history.id, tx).await?;

    Ok(())
}

// Relations:
// - founders
// - localized names

async fn save_label_and_link_relations(
    data: &NewLabel,
    tx: &DatabaseTransaction,
) -> Result<label::Model, DbErr> {
    let label = label::ActiveModel::from(data).insert(tx).await?;

    create_founders(label.id, &data.founders, tx).await?;
    create_localized_names(label.id, &data.localized_names, tx).await?;

    Ok(label)
}

async fn save_label_history_and_link_relations(
    data: &NewLabel,
    tx: &DatabaseTransaction,
) -> Result<label_history::Model, DbErr> {
    let history = label_history::ActiveModel::from(data).insert(tx).await?;

    create_founder_histories(history.id, &data.founders, tx).await?;
    create_localized_name_histories(history.id, &data.localized_names, tx)
        .await?;

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

async fn update_founders(
    label_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    label_founder::Entity::delete_many()
        .filter(label_founder::Column::LabelId.eq(label_id))
        .exec(tx)
        .await?;

    let founders = label_founder_history::Entity::find()
        .filter(label_founder_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(|x| x.artist_id)
        .collect_vec();

    create_founders(label_id, &founders, tx).await
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
            id: NotSet,
            label_id: Set(label_id),
            language_id: Set(name.language_id),
            name: Set(name.name.clone()),
        });

    label_localized_name::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_localized_names(
    label_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    label_localized_name::Entity::delete_many()
        .filter(label_localized_name::Column::LabelId.eq(label_id))
        .exec(tx)
        .await?;

    let names = label_localized_name_history::Entity::find()
        .filter(label_localized_name_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(|x| NewLocalizedName {
            language_id: x.language_id,
            name: x.name,
        })
        .collect_vec();

    create_localized_names(label_id, &names, tx).await
}

async fn create_localized_name_histories(
    label_id: i32,
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
                id: NotSet,
                history_id: Set(label_id),
                language_id: Set(name.language_id),
                name: Set(name.name.clone()),
            });

    label_localized_name_history::Entity::insert_many(active_models)
        .exec(tx)
        .await?;

    Ok(())
}
