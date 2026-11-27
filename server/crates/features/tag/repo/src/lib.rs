mod entities;
mod history;
mod list;
mod model;
mod query;
pub mod write;

pub use entities::{
    TagEntitySort, artists_select, releases_select, songs_select,
};
use entity::{
    tag, tag_alternative_name, tag_alternative_name_history, tag_history,
    tag_relation, tag_relation_history,
};
pub use history::load_history_snapshot;
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError};
pub use list::{TagListItem, TagRow, load_list, load_list_items};
pub use model::{AlternativeName, Tag, TagRef, TagRelation};
pub use query::{find_by_id, find_by_keyword, list_select};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter};

async fn update_alt_names(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("tag.update_alt_names", async {
        tag_alternative_name::Entity::delete_many()
            .filter(tag_alternative_name::Column::TagId.eq(tag_id))
            .exec(tx)
            .await?;

        let alt_names = tag_alternative_name_history::Entity::find()
            .filter(
                tag_alternative_name_history::Column::HistoryId.eq(history_id),
            )
            .all(tx)
            .await?;

        if alt_names.is_empty() {
            return Ok(());
        }

        let models = alt_names.iter().map(|alt_name| {
            tag_alternative_name::ActiveModel {
                id: NotSet,
                tag_id: Set(tag_id),
                name: Set(alt_name.name.clone()),
                is_origin_language: Set(alt_name.is_origin_language),
                language_id: Set(alt_name.language_id),
            }
        });

        tag_alternative_name::Entity::insert_many(models)
            .exec(tx)
            .await?;

        Ok(())
    })
    .await
}

async fn update_relations(
    tag_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("tag.update_relations", async {
        tag_relation::Entity::delete_many()
            .filter(tag_relation::Column::TagId.eq(tag_id))
            .exec(tx)
            .await?;

        let relations = tag_relation_history::Entity::find()
            .filter(tag_relation_history::Column::HistoryId.eq(history_id))
            .all(tx)
            .await?;

        if relations.is_empty() {
            return Ok(());
        }

        let models =
            relations.iter().map(|relation| tag_relation::ActiveModel {
                tag_id: Set(tag_id),
                related_tag_id: Set(relation.related_tag_id),
                r#type: Set(relation.r#type),
            });

        tag_relation::Entity::insert_many(models).exec(tx).await?;

        Ok(())
    })
    .await
}

#[infra_db::observe("tag.apply_update")]
pub async fn apply_history(
    tx: &DatabaseTransaction,
    tag_id: i32,
    history_id: i32,
) -> Result<(), DatabaseError> {
    let history = tag_history::Entity::find_by_id(history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "tag history",
            id: history_id,
        })?;

    tag::ActiveModel {
        id: Set(tag_id),
        name: Set(history.name),
        r#type: Set(history.r#type),
        short_description: Set(history.short_description),
        description: Set(history.description),
    }
    .update(tx)
    .await?;

    update_alt_names(tag_id, history_id, tx).await?;
    update_relations(tag_id, history_id, tx).await?;

    Ok(())
}
