use entity::correction_revision;
use sea_orm::{IntoActiveModel, ModelTrait, QueryOrder};

use super::*;

pub async fn apply_update(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Correction revision not found".to_string())
        })?;

    let history = label_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| DbErr::Custom("Label history not found".to_string()))?;

    let mut active_model = entity::label::Model {
        id: correction.entity_id,
        name: history.name,
        founded_date: history.founded_date,
        founded_date_precision: history.founded_date_precision,
        dissolved_date: history.dissolved_date,
        dissolved_date_precision: history.dissolved_date_precision,
    }
    .into_active_model();
    active_model.id = Set(correction.entity_id);
    active_model.update(tx).await?;

    let label_id = correction.entity_id;
    let history_id = revision.entity_history_id;

    // Update related entities
    update_founders(label_id, history_id, tx).await?;
    update_localized_names(label_id, history_id, tx).await?;

    Ok(())
}

async fn update_founders(
    label_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete existing founders
    label_founder::Entity::delete_many()
        .filter(label_founder::Column::LabelId.eq(label_id))
        .exec(tx)
        .await?;

    // Get history founder records
    let founders = label_founder_history::Entity::find()
        .filter(label_founder_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if founders.is_empty() {
        return Ok(());
    }

    // Create new models from history
    let models = founders.iter().map(|founder| label_founder::ActiveModel {
        label_id: Set(label_id),
        artist_id: Set(founder.artist_id),
    });

    // Insert new models
    label_founder::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn update_localized_names(
    label_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete existing localized names
    label_localized_name::Entity::delete_many()
        .filter(label_localized_name::Column::LabelId.eq(label_id))
        .exec(tx)
        .await?;

    // Get history localized names records
    let names = label_localized_name_history::Entity::find()
        .filter(label_localized_name_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if names.is_empty() {
        return Ok(());
    }

    // Create new models from history
    let models = names.iter().map(|name| label_localized_name::ActiveModel {
        label_id: Set(label_id),
        language_id: Set(name.language_id),
        name: Set(name.name.clone()),
    });

    // Insert new models
    label_localized_name::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}
