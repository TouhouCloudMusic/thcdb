pub mod image {

    use bon::Builder;

    #[derive(Builder, Clone, Debug)]
    pub struct NewImage {
        pub(in crate::domain) filename: String,
        pub(in crate::domain) uploaded_by: i32,
        pub(in crate::domain) directory: String,
    }
}

pub mod user {
    use argon2::password_hash;
    use serde::Serialize;
    use utoipa::ToSchema;

    use super::auth::{AuthCredential, UserRole};

    #[derive(Clone, ToSchema, Serialize)]
    pub struct UserProfile {
        pub name: String,
        /// Avatar url with sub directory, eg. ab/cd/abcd..xyz.jpg
        pub avatar_url: Option<String>,
        pub last_login: chrono::DateTime<chrono::FixedOffset>,
        pub roles: Vec<i32>,
    }

    #[derive(Clone, Debug)]
    pub struct User {
        pub id: i32,
        pub name: String,
        pub password: String,
        pub avatar_id: Option<i32>,
        pub last_login: chrono::DateTime<chrono::FixedOffset>,
        pub roles: Vec<UserRole>,
    }

    impl TryFrom<AuthCredential> for User {
        type Error = password_hash::errors::Error;

        fn try_from(value: AuthCredential) -> Result<Self, Self::Error> {
            Ok(Self {
                id: -1,
                password: value.hashed_password()?,
                name: value.username,
                avatar_id: None,
                last_login: chrono::Utc::now().into(),
                roles: vec![UserRole::User],
            })
        }
    }
}

pub mod auth {
    #[allow(unused_imports)]
    pub use auth_creds::*;
    mod auth_creds;
    #[allow(unused_imports)]
    pub use user_role::*;
    mod user_role;
    #[allow(unused_imports)]
    pub use verfication_code::*;
    mod verfication_code;
}
