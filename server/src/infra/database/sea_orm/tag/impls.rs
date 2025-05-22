use entity::{
    correction_revision, tag, tag_alternative_name,
    tag_alternative_name_history, tag_history, tag_relation,
    tag_relation_history,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    ModelTrait, QueryFilter, QueryOrder,
};

pub async fn apply_correction(
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

    let history = tag_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| DbErr::Custom("Tag history not found".to_string()))?;

    // Convert history to ActiveModel
    let active_model = tag::ActiveModel {
        id: Set(correction.entity_id),
        name: Set(history.name),
        r#type: Set(history.r#type),
        short_description: Set(history.short_description),
        description: Set(history.description),
    };

    active_model.update(tx).await?;

    let tag_id = correction.entity_id;
    let history_id = revision.entity_history_id;

    // Update related entities
    update_alt_names(tag_id, history_id, tx).await?;
    update_relations(tag_id, history_id, tx).await?;

    Ok(())
}

async fn update_alt_names(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete existing alternative names
    tag_alternative_name::Entity::delete_many()
        .filter(tag_alternative_name::Column::TagId.eq(tag_id))
        .exec(tx)
        .await?;

    // Get history alternative name records
    let alt_names = tag_alternative_name_history::Entity::find()
        .filter(tag_alternative_name_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if alt_names.is_empty() {
        return Ok(());
    }

    // Create new models from history
    let models =
        alt_names
            .iter()
            .map(|alt_name| tag_alternative_name::ActiveModel {
                id: NotSet,
                tag_id: Set(tag_id),
                name: Set(alt_name.name.clone()),
                is_origin_language: Set(alt_name.is_origin_language),
                language_id: Set(alt_name.language_id),
            });

    // Insert new models
    tag_alternative_name::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_relations(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete existing relations
    tag_relation::Entity::delete_many()
        .filter(tag_relation::Column::TagId.eq(tag_id))
        .exec(tx)
        .await?;

    // Get history relation records
    let relations = tag_relation_history::Entity::find()
        .filter(tag_relation_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if relations.is_empty() {
        return Ok(());
    }

    // Create new models from history
    let models = relations.iter().map(|relation| tag_relation::ActiveModel {
        tag_id: Set(tag_id),
        related_tag_id: Set(relation.related_tag_id),
        r#type: Set(relation.r#type),
    });

    // Insert new models
    tag_relation::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}
