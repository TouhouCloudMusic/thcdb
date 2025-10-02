use serde::Serialize;
use utoipa::ToSchema;

use super::model::auth::{AuthCredential, UserRole, UserRoleEnum};
use super::repository::{Connection, Transaction};
use crate::infra::error::Error;

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

    /// Whether the querist follows the user. Return `None` if querist is not signed in or it's querist's own profile
    pub is_following: Option<bool>,

    pub bio: Option<String>,
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

impl User {
    pub fn has_roles(&self, expected: &[UserRoleEnum]) -> bool {
        self.roles.iter().any(|r| {
            UserRoleEnum::try_from(r.id)
                .is_ok_and(|role| expected.contains(&role))
        })
    }
}

#[derive(Clone, Debug)]
pub struct NewUser {
    pub name: String,
    pub password: String,
}

impl TryFrom<AuthCredential> for NewUser {
    type Error = Error;

    fn try_from(mut value: AuthCredential) -> Result<Self, Self::Error> {
        Ok(Self {
            password: value.password_hash()?.to_string(),
            name: value.username,
        })
    }
}

#[trait_variant::make(Send)]
pub trait Repository: Connection {
    async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<User>, Box<dyn std::error::Error + Send + Sync>>;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<User>, Box<dyn std::error::Error + Send + Sync>>;
}

#[trait_variant::make(Send)]
pub trait TxRepo: Transaction {
    async fn create(
        &self,
        user: NewUser,
    ) -> Result<User, Box<dyn std::error::Error + Send + Sync>>;
    async fn update(
        &self,
        user: User,
    ) -> Result<User, Box<dyn std::error::Error + Send + Sync>>;
}

pub trait ProfileRepository: Connection {
    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, Box<dyn std::error::Error + Send + Sync>>;

    async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &User,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
