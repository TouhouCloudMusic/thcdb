use chrono::{DateTime, FixedOffset};
use serde::Serialize;
use user_core::UserSummary;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct CurrentImageMetadata {
    pub uploaded_at: DateTime<FixedOffset>,
    pub uploaded_by: UserSummary,
}
