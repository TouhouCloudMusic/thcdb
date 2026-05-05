#![expect(clippy::option_if_let_else, reason = "macro")]
use entity::enums::CorrectionType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::correction::{CorrectionEntity, NewCorrection};
use crate::domain::user::User;

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
