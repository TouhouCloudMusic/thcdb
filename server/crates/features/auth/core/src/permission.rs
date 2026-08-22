use entity::{permission, role_permission, user_role};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use macroweave::splice;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, JoinType, PaginatorTrait,
    QueryFilter, QuerySelect, RelationTrait,
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::user_role::UserRoleEnum;

splice!((Variant, Value) in [
    (CorrectionManage, "correction.manage"),
    (CommentManage,    "comment.manage"),
    (ImageQueueManage, "image.queue.manage"),
    (ListUsers,        "admin.user.read"),
    (ManageUserRoles,  "admin.user.role.write"),
] {
    #[derive(Clone, Copy, Serialize, ToSchema)]
    pub enum Permission {
        #(
            #[serde(rename = Value)]
            Variant,
        )*
    }

    impl Permission {
        pub const ALL: &'static [Permission] = &[
            #(Permission::Variant,)*
        ];

        pub const fn as_str(self) -> &'static str {
            match self {
                #(Self::Variant => Value,)*
            }
        }
    }

    impl TryFrom<String> for Permission {
        type Error = String;

        fn try_from(value: String) -> Result<Self, Self::Error> {
            match value.as_str() {
                #(Value => Ok(Self::Variant),)*
                _ => Err(format!("Unknown permission name: {value}")),
            }
        }
    }
});

pub const fn default_permissions(role: UserRoleEnum) -> &'static [Permission] {
    match role {
        UserRoleEnum::Admin => &[
            Permission::CorrectionManage,
            Permission::CommentManage,
            Permission::ImageQueueManage,
            Permission::ListUsers,
            Permission::ManageUserRoles,
        ],
        UserRoleEnum::Moderator => &[
            Permission::CorrectionManage,
            Permission::CommentManage,
            Permission::ImageQueueManage,
        ],
        UserRoleEnum::User => &[],
    }
}

pub async fn user_has_permission(
    conn: &impl ConnectionTrait,
    user_id: i32,
    permission_name: Permission,
) -> Result<bool, DatabaseError> {
    user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(user_id))
        .join(JoinType::InnerJoin, user_role::Relation::Role.def())
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Role.def().rev(),
        )
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Permission.def(),
        )
        .filter(permission::Column::Name.eq(permission_name.as_str()))
        .exists(conn)
        .await
        .db_operation("query user permission")
}
