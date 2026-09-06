use std::collections::HashMap;

use entity::sea_orm_active_enums::{TagRelationType, TagType};
use entity::{tag, tag_relation};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait, JoinType,
    QueryFilter, QuerySelect, RelationTrait, Select,
};
use serde::Serialize;
use utoipa::ToSchema;

use super::model::TagRef;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct TagListItem {
    pub id: i32,
    pub name: String,
    pub r#type: TagType,
    pub short_description: String,
    pub parents: Vec<TagRef>,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "tag::Entity", from_query_result)]
pub(crate) struct TagRow {
    id: i32,
    name: String,
    r#type: TagType,
    short_description: String,
}

pub(crate) async fn load(
    select: Select<tag::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<TagListItem>, DatabaseError> {
    let tags = select
        .into_partial_model::<TagRow>()
        .all(db)
        .await
        .db_operation("load tag list items")?;

    load_items(tags, db).await
}

/// Loads list associations and returns one item per row in the same order.
pub(crate) async fn load_items(
    tags: Vec<TagRow>,
    db: &impl ConnectionTrait,
) -> Result<Vec<TagListItem>, DatabaseError> {
    if tags.is_empty() {
        return Ok(Vec::new());
    }

    let parent_rows = tag_relation::Entity::find()
        .select_only()
        .column(tag_relation::Column::TagId)
        .column(tag::Column::Id)
        .column(tag::Column::Name)
        .column(tag::Column::Type)
        .join(JoinType::InnerJoin, tag_relation::Relation::Tag2.def())
        .filter(
            tag_relation::Column::TagId.is_in(tags.iter().map(|tag| tag.id)),
        )
        .filter(tag_relation::Column::Type.eq(TagRelationType::Inherit))
        .into_tuple::<(i32, i32, String, TagType)>()
        .all(db)
        .await
        .db_operation("load tag list parents")?;
    let mut parents: HashMap<i32, Vec<TagRef>> = HashMap::new();
    for (tag_id, id, name, r#type) in parent_rows {
        parents
            .entry(tag_id)
            .or_default()
            .push(TagRef { id, name, r#type });
    }

    Ok(tags
        .into_iter()
        .map(|tag| TagListItem {
            id: tag.id,
            name: tag.name,
            r#type: tag.r#type,
            short_description: tag.short_description,
            parents: parents.remove(&tag.id).unwrap_or_default(),
        })
        .collect())
}
