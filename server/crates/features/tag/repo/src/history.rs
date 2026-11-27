use entity::{tag_alternative_name_history, tag_history, tag_relation_history};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QueryOrder,
};
use serde_json::{Value, json};

pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    infra_db::trace("correction.snapshot_tag", async {
        let history = tag_history::Entity::find_by_id(history_id)
            .one(db)
            .await?
            .ok_or_else(|| {
                DbErr::Custom("Tag history not found".to_string())
            })?;

        let alternative_names = tag_alternative_name_history::Entity::find()
            .filter(
                tag_alternative_name_history::Column::HistoryId.eq(history_id),
            )
            .order_by_asc(tag_alternative_name_history::Column::Id)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.name)
            .collect::<Vec<_>>();

        let relations = tag_relation_history::Entity::find()
            .filter(tag_relation_history::Column::HistoryId.eq(history_id))
            .order_by_asc(tag_relation_history::Column::RelatedTagId)
            .all(db)
            .await?
            .into_iter()
            .map(|model| {
                json!({
                    "related_tag_id": model.related_tag_id,
                    "type": model.r#type,
                })
            })
            .collect::<Vec<_>>();

        Ok(json!({
            "name": history.name,
            "type": history.r#type,
            "short_description": history.short_description,
            "description": history.description,
            "alternative_names": alternative_names,
            "relations": relations,
        }))
    })
    .await
}
