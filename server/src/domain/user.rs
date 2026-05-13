use serde::Serialize;
use serde_json::Value;
use utoipa::ToSchema;

use super::model::{UserRole, UserRoleEnum};
use crate::infra::database::error::DatabaseError;

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

    pub stats: UserProfileStats,

    pub settings: Option<Value>,
}

#[expect(
    clippy::struct_field_names,
    reason = "API payload uses explicit *_count field names"
)]
#[derive(Clone, ToSchema, Serialize)]
pub struct UserProfileStats {
    pub edit_count: u64,
    pub vote_count: u64,
}

#[derive(Clone, Debug)]
pub struct EmailVerification {
    pub hash: String,
    pub expires_at: chrono::DateTime<chrono::FixedOffset>,
    pub sent_at: chrono::DateTime<chrono::FixedOffset>,
    pub failed_attempts: i32,
}

impl EmailVerification {
    pub fn in_resend_cooldown(
        &self,
        now: chrono::DateTime<chrono::FixedOffset>,
        cooldown: chrono::Duration,
    ) -> bool {
        now - self.sent_at < cooldown
    }
}

#[derive(Clone, Debug)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub email_verified: bool,
    pub password: String,
    pub email_verification: Option<EmailVerification>,
    pub avatar_id: Option<i32>,
    pub profile_banner_id: Option<i32>,
    pub last_login: chrono::DateTime<chrono::FixedOffset>,
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
    pub roles: Vec<UserRole>,
    pub bio: Option<String>,
    pub settings: Value,
}

impl User {
    pub fn has_roles(&self, expected: &[UserRoleEnum]) -> bool {
        self.roles
            .iter()
            .map(UserRoleEnum::from)
            .any(|role| expected.contains(&role))
    }
}

#[derive(Clone, Debug)]
pub struct NewUser {
    pub name: String,
    pub email: String,
    pub email_verified: bool,
    pub password: String,
}

#[trait_variant::make(Send)]
pub trait Repository {
    async fn find_by_id(&self, id: i32) -> Result<Option<User>, DatabaseError>;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<User>, DatabaseError>;
}

#[trait_variant::make(Send)]
pub trait TxRepo {
    async fn create(&self, user: NewUser) -> Result<User, DatabaseError>;
    async fn update(&self, user: User) -> Result<User, DatabaseError>;
}

pub trait ProfileRepository {
    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, DatabaseError>;

    async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &User,
    ) -> Result<(), DatabaseError>;
}
