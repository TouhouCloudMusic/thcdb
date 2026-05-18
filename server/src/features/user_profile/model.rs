use serde::Serialize;
use serde_json::Value;
use utoipa::ToSchema;

use crate::features::auth::{PermissionName, UserRole};

#[serde_with::apply(
    Vec    => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option => #[serde(skip_serializing_if = "Option::is_none")]
)]
#[derive(Clone, ToSchema, Serialize)]
pub struct UserProfile {
    pub name: String,

    /// Avatar url with sub directory, eg. ab/cd/abcd..xyz.jpg
    pub avatar_url: Option<String>,

    /// Banner url with sub directory, eg. ab/cd/abcd..xyz.jpg
    pub banner_url: Option<String>,
    pub last_login: chrono::DateTime<chrono::FixedOffset>,
    pub roles: Vec<UserRole>,
    pub permissions: Vec<PermissionName>,

    /// Whether the querist follows the user. Return `None` if querist is not signed in or it's querist's own profile
    pub is_following: Option<bool>,

    pub bio: Option<String>,

    pub stats: UserProfileStats,

    pub settings: Option<Value>,
}

#[derive(Clone, ToSchema, Serialize)]
pub struct UserProfileStats {
    pub edit_count: u64,
    pub vote_count: u64,
}
