use chrono::{DateTime, FixedOffset};
use entity::user as user_entity;
use sea_orm::DerivePartialModel;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct CurrentImageMetadata {
    pub uploaded_at: DateTime<FixedOffset>,
    pub uploaded_by: ImageUploaderSummary,
}

#[derive(Clone, Debug, Serialize, ToSchema, DerivePartialModel)]
#[sea_orm(entity = "user_entity::Entity", from_query_result)]
pub struct ImageUploaderSummary {
    pub id: i32,
    pub name: String,
}
