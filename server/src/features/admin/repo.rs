use std::collections::BTreeSet;

use entity::{user, user_role};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseTransaction, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
};
use sea_query::{ExprTrait, Func, LockType};

use crate::features::auth::{EditableUserRole, UserRoleEnum};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(super) struct UserPage {
    pub(super) total_items: u64,
    pub(super) users: Vec<(user::Model, Vec<user_role::Model>)>,
}

pub(super) async fn list_users(
    conn: &impl ConnectionTrait,
    keyword: Option<String>,
    offset: u64,
    limit: u64,
) -> Result<UserPage, DatabaseError> {
    let mut select = user::Entity::find();
    if let Some(keyword) = keyword {
        let pattern = format!("%{keyword}%");
        select = select
            .filter(Func::lower(user::Column::Name.into_expr()).like(pattern));
    }

    let total_items = select
        .clone()
        .count(conn)
        .await
        .db_operation("count admin users")?;
    let users = select
        .order_by_asc(user::Column::Id)
        .offset(offset)
        .limit(limit)
        .find_with_related(user_role::Entity)
        .all(conn)
        .await
        .db_operation("find admin users")?;

    Ok(UserPage { total_items, users })
}

pub(super) async fn lock_user(
    conn: &DatabaseTransaction,
    user_id: i32,
) -> Result<bool, DatabaseError> {
    user::Entity::find_by_id(user_id)
        .select_only()
        .column(user::Column::Id)
        .lock(LockType::NoKeyUpdate)
        .into_tuple::<i32>()
        .one(conn)
        .await
        .db_operation("find user for role update")
        .map(|user_id| user_id.is_some())
}

pub(super) async fn load_user_roles(
    conn: &impl ConnectionTrait,
    user_id: i32,
) -> Result<Vec<user_role::Model>, DatabaseError> {
    user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(user_id))
        .all(conn)
        .await
        .db_operation("find user roles")
}

pub(super) async fn replace_editable_user_roles(
    conn: &DatabaseTransaction,
    user_id: i32,
    roles: &BTreeSet<EditableUserRole>,
) -> Result<(), DatabaseError> {
    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.eq(user_id))
        .filter(
            user_role::Column::RoleId.is_in(EditableUserRole::all_role_ids()),
        )
        .exec(conn)
        .await
        .db_operation("delete old editable user roles")?;

    let roles = roles.iter().copied().map(|role| user_role::ActiveModel {
        user_id: Set(user_id),
        role_id: Set(UserRoleEnum::from(role).into()),
    });
    user_role::Entity::insert_many(roles)
        .on_empty_do_nothing()
        .exec(conn)
        .await
        .db_operation("insert new user roles")?;

    Ok(())
}
