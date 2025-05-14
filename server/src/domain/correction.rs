use chrono::{DateTime, FixedOffset};
use entity::enums::{CorrectionStatus, CorrectionType, EntityType};

use super::user::User;

pub trait CorrectionEntity {
    fn entity_type(&self) -> EntityType;
}

pub struct Correction<T> {
    pub data: T,
    pub author: User,
    pub description: String,
    pub status: CorrectionStatus,
    pub r#type: CorrectionType,
    pub entity_id: i32,
    pub entity_type: EntityType,
    pub created_at: DateTime<FixedOffset>,
    pub handled_at: Option<DateTime<FixedOffset>>,
}

pub struct NewCorrection<T>
where
    T: CorrectionEntity,
{
    pub data: T,
    pub author: User,
    pub description: String,
    pub r#type: CorrectionType,
}

impl<T> CorrectionEntity for NewCorrection<T>
where
    T: CorrectionEntity,
{
    fn entity_type(&self) -> EntityType {
        self.data.entity_type()
    }
}

pub trait Repo: super::repository::Connection {
    async fn pending_correction(
        &self,
        id: i32,
        entity_type: EntityType,
    ) -> Result<Option<i32>, Self::Error>;
}
