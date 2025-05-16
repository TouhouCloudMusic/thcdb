use chrono::{DateTime, FixedOffset};
use entity::enums::{CorrectionStatus, CorrectionType, EntityType};

use super::CorrectionEntity;
use crate::domain::user::User;

pub struct Correction {
    pub id: i32,
    pub status: CorrectionStatus,
    pub r#type: CorrectionType,
    pub entity_id: i32,
    pub entity_type: EntityType,
    pub created_at: DateTime<FixedOffset>,
    pub handled_at: Option<DateTime<FixedOffset>>,
}

pub struct CorrectionRevision {
    pub entity_history_id: i32,
    pub author_id: i32,
    pub description: String,
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

pub struct NewCorrectionMeta<T> {
    pub author: User,
    pub r#type: CorrectionType,
    pub entity_id: i32,
    pub history_id: i32,
    pub description: String,
    pub phantom: std::marker::PhantomData<T>,
}

impl<T> NewCorrectionMeta<T>
where
    T: CorrectionEntity,
{
    #[expect(clippy::unused_self)]
    pub fn entity_type(&self) -> EntityType {
        T::entity_type()
    }
}
