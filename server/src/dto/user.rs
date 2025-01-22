use axum::body::Bytes;
use axum_typed_multipart::{FieldData, TryFromMultipart};
use juniper::GraphQLInputObject;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(GraphQLInputObject, ToSchema, Deserialize, Serialize)]
pub struct SignUp {
    pub username: String,
    pub password: String,
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
