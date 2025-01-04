use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Debug, Clone, ToSchema, Deserialize)]
pub struct Metadata {
    pub author_id: i32,
    pub description: String,
}
