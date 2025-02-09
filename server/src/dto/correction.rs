use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Debug, Clone, ToSchema, Deserialize)]
pub struct Metadata {
    pub description: String,
}
