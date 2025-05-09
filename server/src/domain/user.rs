use serde::Serialize;
use utoipa::ToSchema;

use super::model::auth::{AuthCredential, UserRole};
use super::model::markdown::Markdown;
use super::repository::{Connection, Transaction};
use crate::error::InfraError;

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
    pub bio: Option<Markdown>,
}

#[derive(Clone, Debug)]
pub struct NewUser {
    pub name: String,
    pub password: String,
}

impl TryFrom<AuthCredential> for NewUser {
    type Error = InfraError;

    fn try_from(mut value: AuthCredential) -> Result<Self, Self::Error> {
        Ok(Self {
            password: value.password_hash()?.to_string(),
            name: value.username,
        })
    }
}

#[trait_variant::make(Send)]
pub trait Repository: Connection {
    async fn find_by_id(&self, id: i32) -> Result<Option<User>, Self::Error>;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<User>, Self::Error>;
}

#[trait_variant::make(Send)]
pub trait TransactionRepository: Transaction {
    async fn create(&self, user: NewUser) -> Result<User, Self::Error>;
    async fn update(&self, user: User) -> Result<User, Self::Error>;
}

pub trait ProfileRepository: Connection {
    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, Self::Error>;

    async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &User,
    ) -> Result<(), Self::Error>;
}
