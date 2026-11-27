mod history;
mod model;
mod query;
pub mod write;

use entity::{
    credit_role, credit_role_history, credit_role_inheritance,
    credit_role_inheritance_history,
};
pub use history::load_history_snapshot;
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError};
pub use model::{CreditRole, CreditRoleSummary};
pub use query::{find_by_id, find_many_summary};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, Set,
};

async fn update_credit_role_inheritance(
    role_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("credit_role.update_inheritance", async {
        credit_role_inheritance::Entity::delete_many()
            .filter(credit_role_inheritance::Column::RoleId.eq(role_id))
            .exec(tx)
            .await?;

        let inheritance_history =
            credit_role_inheritance_history::Entity::find()
                .filter(
                    credit_role_inheritance_history::Column::HistoryId
                        .eq(history_id),
                )
                .all(tx)
                .await?;

        if inheritance_history.is_empty() {
            return Ok(());
        }

        let models = inheritance_history.into_iter().map(|inheritance| {
            credit_role_inheritance::ActiveModel {
                role_id: Set(role_id),
                super_id: Set(inheritance.super_id),
            }
        });

        credit_role_inheritance::Entity::insert_many(models)
            .exec(tx)
            .await?;

        Ok(())
    })
    .await
}

#[infra_db::observe("credit_role.apply_update")]
pub async fn apply_history(
    tx: &DatabaseTransaction,
    role_id: i32,
    history_id: i32,
) -> Result<(), DatabaseError> {
    let history = credit_role_history::Entity::find_by_id(history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "credit role history",
            id: history_id,
        })?;

    credit_role::ActiveModel {
        id: Set(role_id),
        name: Set(history.name),
        short_description: Set(history.short_description),
        description: Set(history.description),
    }
    .update(tx)
    .await?;

    update_credit_role_inheritance(role_id, history_id, tx).await?;
    Ok(())
}
