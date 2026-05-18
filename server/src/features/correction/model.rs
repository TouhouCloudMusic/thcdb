#![expect(clippy::option_if_let_else, reason = "macro")]

use chrono::{DateTime, FixedOffset};
use entity::enums::{CorrectionStatus, CorrectionType, EntityType};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::features::user::User;

pub trait CorrectionEntity {
    fn entity_type() -> EntityType;
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Correction {
    pub id: i32,
    pub status: CorrectionStatus,
    pub r#type: CorrectionType,
    pub entity_id: i32,
    pub entity_type: EntityType,
    pub created_at: DateTime<FixedOffset>,
    pub handled_at: Option<DateTime<FixedOffset>>,
}

pub struct CorrectionFilter {
    pub entity_id: i32,
    pub entity_type: EntityType,
    pub status: Option<CorrectionFilterStatus>,
}

#[derive(derive_more::From)]
pub enum CorrectionFilterStatus {
    Many(Vec<CorrectionStatus>),
    One(CorrectionStatus),
}

impl CorrectionFilter {
    pub fn pending(entity_id: i32, entity_type: EntityType) -> Self {
        Self {
            entity_id,
            entity_type,
            status: Some(CorrectionStatus::Pending.into()),
        }
    }

    pub const fn latest(entity_id: i32, entity_type: EntityType) -> Self {
        Self {
            entity_id,
            entity_type,
            status: None,
        }
    }
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

// TODO: just use user id and role or use ref
pub struct NewCorrectionMeta<T> {
    pub author: User,
    pub r#type: CorrectionType,
    pub entity_id: i32,
    pub history_id: i32,
    pub description: String,
    pub status: CorrectionStatus,
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

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct CorrectionDiffEntry {
    pub path: String,
    pub before: Option<String>,
    pub after: Option<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct CorrectionDiff {
    pub entity_id: i32,
    pub entity_type: EntityType,
    pub base_correction_id: Option<i32>,
    pub base_history_id: Option<i32>,
    pub target_correction_id: i32,
    pub target_history_id: i32,
    pub changes: Vec<CorrectionDiffEntry>,
}

#[derive(Deserialize, ToSchema)]
#[schema(
    as = NewCorrection
)]
pub struct NewCorrectionDto<T>
where
    T: CorrectionEntity,
{
    #[schema(inline = false)]
    pub data: T,
    pub description: String,
    pub r#type: CorrectionType,
}

#[derive(Serialize, ToSchema)]
pub struct CorrectionSubmitResult {
    pub kind: CorrectionSubmitKind,
    correction_id: i32,
    pub entity_id: i32,
}

#[derive(Serialize, ToSchema, PartialEq, Eq)]
pub enum CorrectionSubmitKind {
    Submitted,
    Conflict,
}

impl CorrectionSubmitResult {
    pub const fn submitted(correction_id: i32, entity_id: i32) -> Self {
        Self {
            kind: CorrectionSubmitKind::Submitted,
            correction_id,
            entity_id,
        }
    }

    pub const fn conflict(correction_id: i32, entity_id: i32) -> Self {
        Self {
            kind: CorrectionSubmitKind::Conflict,
            correction_id,
            entity_id,
        }
    }

    pub const fn submitted_id(&self) -> Option<i32> {
        if matches!(self.kind, CorrectionSubmitKind::Submitted) {
            Some(self.correction_id)
        } else {
            None
        }
    }

    pub const fn conflict_id(&self) -> Option<i32> {
        if matches!(self.kind, CorrectionSubmitKind::Conflict) {
            Some(self.correction_id)
        } else {
            None
        }
    }
}

impl<T> NewCorrectionDto<T>
where
    T: CorrectionEntity,
{
    pub fn with_author(self, author: User) -> NewCorrection<T> {
        NewCorrection {
            data: self.data,
            author,
            description: self.description,
            r#type: self.r#type,
        }
    }
}

#[derive(Deserialize, ToSchema)]
pub enum HandleCorrectionMethod {
    Approve,
    Reject,
}

#[derive(Clone, Serialize, ToSchema)]
pub struct CorrectionUserSummary {
    pub id: i32,
    pub name: String,
}
