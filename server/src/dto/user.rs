use axum::body::Bytes;
use axum_typed_multipart::{FieldData, TryFromMultipart};
use utoipa::ToSchema;

#[derive(ToSchema, TryFromMultipart, Debug)]
pub struct UploadAvatar {
    #[form_data(limit = "10MiB")]
    #[schema(
        value_type = String,
        format = Binary,
        maximum = 10485760,
        minimum = 1024
    )]
    pub data: FieldData<Bytes>,
}
