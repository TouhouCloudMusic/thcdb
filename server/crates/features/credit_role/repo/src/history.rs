use entity::{credit_role_history, credit_role_inheritance_history};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QueryOrder,
};
use serde_json::{Value, json};

pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    infra_db::trace("correction.snapshot_credit_role", async {
        let history = credit_role_history::Entity::find_by_id(history_id)
            .one(db)
            .await?
            .ok_or_else(|| {
                DbErr::Custom("Credit role history not found".to_string())
            })?;

        let inherits = credit_role_inheritance_history::Entity::find()
            .filter(
                credit_role_inheritance_history::Column::HistoryId
                    .eq(history_id),
            )
            .order_by_asc(credit_role_inheritance_history::Column::SuperId)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.super_id)
            .collect::<Vec<_>>();

        Ok(json!({
            "name": history.name,
            "short_description": history.short_description,
            "description": history.description,
            "inherits": inherits,
        }))
    })
    .await
}
