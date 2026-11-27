mod history;
mod list;
mod model;
mod query;
pub mod write;

use entity::{
    label, label_founder, label_founder_history, label_history, label_link,
    label_link_history, label_localized_name, label_localized_name_history,
};
pub use history::load_history_snapshot;
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError};
pub use list::{LabelListItem, LabelRow, load_list, load_list_items};
pub use model::Label;
pub use query::{find_by_id, find_by_keyword, list_select};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter};

async fn update_founders(
    label_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("label.update_founders", async {
        label_founder::Entity::delete_many()
            .filter(label_founder::Column::LabelId.eq(label_id))
            .exec(tx)
            .await?;

        let founders = label_founder_history::Entity::find()
            .filter(label_founder_history::Column::HistoryId.eq(history_id))
            .all(tx)
            .await?;

        if founders.is_empty() {
            return Ok(());
        }

        let models =
            founders
                .into_iter()
                .map(|founder| label_founder::ActiveModel {
                    label_id: Set(label_id),
                    artist_id: Set(founder.artist_id),
                });

        label_founder::Entity::insert_many(models).exec(tx).await?;

        Ok(())
    })
    .await
}

async fn update_localized_names(
    label_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("label.update_localized_names", async {
        label_localized_name::Entity::delete_many()
            .filter(label_localized_name::Column::LabelId.eq(label_id))
            .exec(tx)
            .await?;

        let names = label_localized_name_history::Entity::find()
            .filter(
                label_localized_name_history::Column::HistoryId.eq(history_id),
            )
            .all(tx)
            .await?;

        if names.is_empty() {
            return Ok(());
        }

        let models =
            names
                .into_iter()
                .map(|name| label_localized_name::ActiveModel {
                    label_id: Set(label_id),
                    language_id: Set(name.language_id),
                    name: Set(name.name),
                });

        label_localized_name::Entity::insert_many(models)
            .exec(tx)
            .await?;

        Ok(())
    })
    .await
}

async fn update_links(
    label_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("label.update_links", async {
        label_link::Entity::delete_many()
            .filter(label_link::Column::LabelId.eq(label_id))
            .exec(tx)
            .await?;

        let links = label_link_history::Entity::find()
            .filter(label_link_history::Column::HistoryId.eq(history_id))
            .all(tx)
            .await?;

        if links.is_empty() {
            return Ok(());
        }

        let models = links.into_iter().map(|link| label_link::ActiveModel {
            id: NotSet,
            label_id: Set(label_id),
            url: Set(link.url),
        });

        label_link::Entity::insert_many(models).exec(tx).await?;

        Ok(())
    })
    .await
}

#[infra_db::observe("label.apply_update")]
pub async fn apply_history(
    tx: &DatabaseTransaction,
    label_id: i32,
    history_id: i32,
) -> Result<(), DatabaseError> {
    let history = label_history::Entity::find_by_id(history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "label history",
            id: history_id,
        })?;

    let active_model = label::ActiveModel {
        id: Set(label_id),
        name: Set(history.name),
        founded_date: Set(history.founded_date),
        founded_date_precision: Set(history.founded_date_precision),
        dissolved_date: Set(history.dissolved_date),
        dissolved_date_precision: Set(history.dissolved_date_precision),
    };

    active_model.update(tx).await?;
    update_founders(label_id, history_id, tx).await?;
    update_localized_names(label_id, history_id, tx).await?;
    update_links(label_id, history_id, tx).await?;

    Ok(())
}
