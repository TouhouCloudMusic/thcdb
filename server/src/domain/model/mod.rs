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
    use serde::Serialize;
    use utoipa::ToSchema;

    #[derive(Clone, ToSchema, Serialize)]
    pub struct UserProfile {
        pub name: String,
        /// Avatar url with sub directory, eg. ab/cd/abcd..xyz.jpg
        pub avatar_url: Option<String>,
        pub last_login: chrono::DateTime<chrono::FixedOffset>,
        pub roles: Vec<i32>,
    }
}
