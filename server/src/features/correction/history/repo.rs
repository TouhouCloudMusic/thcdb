use std::collections::HashMap;

use entity::enums::CorrectionStatus;
use entity::{correction as correction_entity, correction_revision, user};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, JoinType, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait,
};

use crate::features::correction::model::CorrectionUserSummary;

#[derive(Clone)]
pub(super) struct CorrectionRevisionAuthor {
    pub(super) author: CorrectionUserSummary,
    pub(super) description: String,
}

pub(super) async fn list_approved_corrections(
    conn: &impl ConnectionTrait,
    entity_type: entity::enums::EntityType,
    entity_id: i32,
) -> Result<Vec<correction_entity::Model>, DbErr> {
    correction_entity::Entity::find()
        .filter(correction_entity::Column::EntityId.eq(entity_id))
        .filter(correction_entity::Column::EntityType.eq(entity_type))
        .filter(
            correction_entity::Column::Status.eq(CorrectionStatus::Approved),
        )
        .order_by_desc(correction_entity::Column::HandledAt)
        .order_by_desc(correction_entity::Column::CreatedAt)
        .all(conn)
        .await
}

pub(super) async fn load_latest_revision_authors(
    conn: &impl ConnectionTrait,
    correction_ids: Vec<i32>,
) -> Result<HashMap<i32, CorrectionRevisionAuthor>, DbErr> {
    let revisions = correction_revision::Entity::find()
        .select_only()
        .column(correction_revision::Column::CorrectionId)
        .column(correction_revision::Column::Description)
        .column(correction_revision::Column::AuthorId)
        .column(user::Column::Name)
        .join(
            JoinType::InnerJoin,
            correction_revision::Relation::User.def(),
        )
        .filter(correction_revision::Column::CorrectionId.is_in(correction_ids))
        .order_by_asc(correction_revision::Column::CorrectionId)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .into_tuple::<(i32, String, i32, String)>()
        .all(conn)
        .await?;

    let mut revision_map = HashMap::new();
    for (correction_id, description, author_id, author_name) in revisions {
        revision_map
            .entry(correction_id)
            .or_insert(CorrectionRevisionAuthor {
                author: CorrectionUserSummary {
                    id: author_id,
                    name: author_name,
                },
                description,
            });
    }

    Ok(revision_map)
}
