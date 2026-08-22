use entity::{correction_revision, user};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, JoinType, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait,
};
use user_core::UserSummary;

use super::model::CorrectionRevisionSummary;

pub(super) async fn list_revisions(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<Vec<CorrectionRevisionSummary>, DbErr> {
    let summaries = correction_revision::Entity::find()
        .select_only()
        .column(correction_revision::Column::EntityHistoryId)
        .column(correction_revision::Column::Description)
        .column(correction_revision::Column::AuthorId)
        .column(user::Column::Name)
        .join(
            JoinType::InnerJoin,
            correction_revision::Relation::User.def(),
        )
        .filter(correction_revision::Column::CorrectionId.eq(correction_id))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .into_tuple::<(i32, String, i32, String)>()
        .all(conn)
        .await?
        .into_iter()
        .map(|(entity_history_id, description, author_id, author_name)| {
            CorrectionRevisionSummary {
                entity_history_id,
                author: UserSummary {
                    id: author_id,
                    name: author_name,
                },
                description,
            }
        })
        .collect::<Vec<_>>();

    Ok(summaries)
}
