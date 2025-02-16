use axum::body::Bytes;
use axum_typed_multipart::{FieldData, TryFromMultipart};
use juniper::GraphQLInputObject;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, ToSchema, Serialize)]
pub struct UserProfile {
    pub name: String,
    /// Avatar url with sub directory, eg. ab/cd/abcd..xyz.jpg
    pub avatar_url: Option<String>,
    pub last_login: Option<chrono::DateTime<chrono::FixedOffset>>,
    pub roles: Vec<i32>,
}

#[derive(GraphQLInputObject, ToSchema, Clone, Deserialize, Serialize)]
pub struct AuthCredential {
    pub username: String,
    pub password: String,
}

#[derive(ToSchema, TryFromMultipart, Debug)]
pub struct UploadAvatar {
    #[form_data(limit = "10MiB")]
    #[schema(value_type = String, format = Binary)]
    pub data: FieldData<Bytes>,
}
