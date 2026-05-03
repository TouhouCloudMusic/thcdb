use crate::domain::model::UserRoleEnum;

pub trait PermissionMarker {
    const NAME: &'static str;
}

macro_rules! permission_markers {
    ($($ty:ident = $name:literal;)+) => {
        $(
            pub struct $ty;
            impl PermissionMarker for $ty {
                const NAME: &'static str = $name;
            }
        )+
    };
}

permission_markers! {
    CorrectionManage = "correction.manage";
    CommentManage = "comment.manage";
    ImageQueueManage = "image.queue.manage";
    AdminUserRead = "admin.user.read";
    AdminWrite = "admin.user.role.write";
}

#[derive(Clone, Copy)]
pub struct PermissionDef {
    pub name: &'static str,
    pub description: Option<&'static str>,
}

macro_rules! permission_defs {
    ($($marker:ident => $desc:literal;)+) => {
        impl PermissionDef {
            pub const ALL: &'static [PermissionDef] = &[
                $(
                    PermissionDef {
                        name: $marker::NAME,
                        description: Some($desc),
                    },
                )+
            ];
        }
    };
}

permission_defs! {
    CorrectionManage => "Manage corrections";
    CommentManage => "Manage comments";
    ImageQueueManage => "Manage image queue";
    AdminUserRead => "Read users list";
    AdminWrite => "Update user roles";
}

macro_rules! default_permissions_for_role {
    ($($role:ident => [$($permission:ident),* $(,)?];)+) => {
        impl UserRoleEnum {
            pub const fn default_permissions(self) -> &'static [&'static str] {
                match self {
                    $(
                        UserRoleEnum::$role => &[
                            $($permission::NAME,)*
                        ],
                    )+
                }
            }
        }
    }
}

default_permissions_for_role! {
    Admin => [CorrectionManage, CommentManage, ImageQueueManage, AdminUserRead, AdminWrite];
    Moderator => [CorrectionManage, CommentManage, ImageQueueManage];
    User => [];
}
