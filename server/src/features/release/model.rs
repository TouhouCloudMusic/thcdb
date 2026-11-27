use rating_core::RatingSummary;
use release_repo::Release;
use release_repo::write::NewRelease;
use serde::Serialize;
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;

impl CorrectionEntity for NewRelease {
    fn entity_type() -> entity::enums::EntityType {
        entity::enums::EntityType::Release
    }
}

#[derive(Clone, Debug, ToSchema, Serialize)]
pub struct ReleaseDetail {
    #[serde(flatten)]
    pub release: Release,
    pub rating: RatingSummary,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct SimpleRelease {
    pub id: i32,
    pub title: String,
    pub cover_art_url: Option<String>,
}
