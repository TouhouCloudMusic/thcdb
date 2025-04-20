use argon2::password_hash;
use serde::Serialize;
use utoipa::ToSchema;

use super::auth::{AuthCredential, UserRole, UserRoleEnum};

#[derive(Clone, ToSchema, Serialize)]
pub struct UserProfile {
    pub name: String,

    /// Avatar url with sub directory, eg. ab/cd/abcd..xyz.jpg
    #[schema(nullable = false)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,

    /// Banner url with sub directory, eg. ab/cd/abcd..xyz.jpg
    #[schema(nullable = false)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_url: Option<String>,
    pub last_login: chrono::DateTime<chrono::FixedOffset>,
    pub roles: Vec<UserRole>,

    /// Whether the querist follows the user. Return `None` if querist is not signed in or it's querist's own profile
    #[schema(nullable = false)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_following: Option<bool>,
}

#[derive(Clone, Debug)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub password: String,
    pub avatar_id: Option<i32>,
    pub profile_banner_id: Option<i32>,
    pub last_login: chrono::DateTime<chrono::FixedOffset>,
    pub roles: Vec<UserRole>,
    pub bio: Option<String>,
}

impl TryFrom<AuthCredential> for User {
    type Error = password_hash::errors::Error;

    fn try_from(value: AuthCredential) -> Result<Self, Self::Error> {
        Ok(Self {
            id: -1,
            password: value.hashed_password()?,
            name: value.username,
            avatar_id: None,
            profile_banner_id: None,
            last_login: chrono::Utc::now().into(),
            roles: vec![UserRoleEnum::User.into()],
            bio: None,
        })
    }
}
