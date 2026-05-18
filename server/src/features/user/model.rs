use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveModel;
use serde_json::Value;

use crate::features::auth::UserRole;

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

#[derive(Clone, Debug)]
pub struct NewUser {
    pub name: String,
    pub email: String,
    pub email_verified: bool,
    pub password: String,
}

impl From<entity::user::Model> for User {
    fn from(value: entity::user::Model) -> Self {
        Self {
            id: value.id,
            name: value.name,
            email: value.email,
            email_verified: value.email_verified,
            password: value.password,
            email_verification: None,
            avatar_id: value.avatar_id,
            profile_banner_id: value.profile_banner_id,
            last_login: value.last_login,
            created_at: value.created_at,
            roles: vec![],
            bio: value.bio,
            settings: value.settings,
        }
    }
}

impl IntoActiveModel<entity::user::ActiveModel> for User {
    fn into_active_model(self) -> entity::user::ActiveModel {
        entity::user::ActiveModel {
            id: Set(self.id),
            name: Set(self.name),
            email: Set(self.email),
            email_verified: Set(self.email_verified),
            password: Set(self.password),
            avatar_id: Set(self.avatar_id),
            last_login: Set(self.last_login),
            created_at: Set(self.created_at),
            profile_banner_id: Set(self.profile_banner_id),
            bio: Set(self.bio),
            settings: Set(self.settings),
        }
    }
}

impl From<NewUser> for entity::user::ActiveModel {
    fn from(val: NewUser) -> Self {
        Self {
            id: NotSet,
            name: Set(val.name),
            email: Set(val.email),
            email_verified: Set(val.email_verified),
            password: Set(val.password),
            avatar_id: NotSet,
            last_login: NotSet,
            created_at: NotSet,
            profile_banner_id: NotSet,
            bio: NotSet,
            settings: NotSet,
        }
    }
}

impl IntoActiveModel<entity::user::ActiveModel> for NewUser {
    fn into_active_model(self) -> entity::user::ActiveModel {
        self.into()
    }
}
