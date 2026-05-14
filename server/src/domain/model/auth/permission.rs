use std::str::FromStr;

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::openapi::{ObjectBuilder, RefOr, Schema};
use utoipa::{PartialSchema, ToSchema, openapi};

use crate::domain::model::UserRoleEnum;

#[derive(Clone, Copy)]
pub struct PermissionDef {
    pub name: PermissionName,
    pub description: Option<&'static str>,
}

macro_rules! permissions {
    ($($marker:ident = $name:literal => $desc:literal;)+) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq)]
        pub enum PermissionName {
            $($marker,)+
        }

        impl PermissionName {
            pub const ALL: &'static [Self] = &[
                $(Self::$marker,)+
            ];

            pub const fn as_str(self) -> &'static str {
                match self {
                    $(Self::$marker => $name,)+
                }
            }
        }

        impl PermissionDef {
            pub const ALL: &'static [PermissionDef] = &[
                $(
                    PermissionDef {
                        name: PermissionName::$marker,
                        description: Some($desc),
                    },
                )+
            ];
        }
    };
}

permissions! {
    CorrectionManage = "correction.manage" => "Manage corrections";
    CommentManage = "comment.manage" => "Manage comments";
    ImageQueueManage = "image.queue.manage" => "Manage image queue";
    AdminUserRead = "admin.user.read" => "Read users list";
    AdminWrite = "admin.user.role.write" => "Update user roles";
}

impl Serialize for PermissionName {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for PermissionName {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        value.parse().map_err(serde::de::Error::custom)
    }
}

impl PartialSchema for PermissionName {
    fn schema() -> RefOr<Schema> {
        ObjectBuilder::new()
            .schema_type(openapi::Type::String)
            .enum_values(Some(
                PermissionName::ALL.iter().map(|value| value.as_str()),
            ))
            .build()
            .into()
    }
}

impl ToSchema for PermissionName {}

impl FromStr for PermissionName {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        for permission in Self::ALL {
            if permission.as_str() == value {
                return Ok(*permission);
            }
        }

        Err(format!("Unknown permission name: {value}"))
    }
}

impl TryFrom<String> for PermissionName {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        value.parse()
    }
}

macro_rules! default_permissions_for_role {
    ($($role:ident => [$($permission:ident),* $(,)?];)+) => {
        impl UserRoleEnum {
            pub const fn default_permissions(self) -> &'static [PermissionName] {
                match self {
                    $(
                        UserRoleEnum::$role => &[
                            $(PermissionName::$permission,)*
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
