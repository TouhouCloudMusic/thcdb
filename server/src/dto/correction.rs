use serde::Deserialize;
use utoipa::ToSchema;

// TODO: 删除用户输入中的user id
#[derive(Debug, Clone, ToSchema, Deserialize)]
pub struct Metadata {
    pub author_id: i32,
    pub description: String,
}
