use auth_core::permission::Permission;
use entity::enums::CorrectionUserType;
use entity::{
    correction_subscription, correction_user, permission, role_permission,
    user_role,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, JoinType, QueryFilter,
    QuerySelect, RelationTrait,
};

pub(super) async fn load_review_recipients(
    conn: &impl ConnectionTrait,
    actor_id: i32,
) -> Result<Vec<i32>, DatabaseError> {
    user_role::Entity::find()
        .select_only()
        .column(user_role::Column::UserId)
        .distinct()
        .join(JoinType::InnerJoin, user_role::Relation::Role.def())
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Role.def().rev(),
        )
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Permission.def(),
        )
        .filter(
            permission::Column::Name.eq(Permission::CorrectionManage.as_str()),
        )
        .filter(user_role::Column::UserId.ne(actor_id))
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("resolve correction review notification recipients")
}

pub(super) async fn load_subscribers(
    conn: &impl ConnectionTrait,
    correction_id: i32,
    actor_id: i32,
) -> Result<Vec<i32>, DatabaseError> {
    correction_subscription::Entity::find()
        .select_only()
        .column(correction_subscription::Column::UserId)
        .filter(correction_subscription::Column::CorrectionId.eq(correction_id))
        .filter(correction_subscription::Column::UserId.ne(actor_id))
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("resolve correction notification subscribers")
}

pub(super) async fn load_author(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<Option<i32>, DatabaseError> {
    correction_user::Entity::find()
        .select_only()
        .column(correction_user::Column::UserId)
        .filter(correction_user::Column::CorrectionId.eq(correction_id))
        .filter(
            correction_user::Column::UserType.eq(CorrectionUserType::Author),
        )
        .into_tuple::<i32>()
        .one(conn)
        .await
        .db_operation("resolve correction author")
}
