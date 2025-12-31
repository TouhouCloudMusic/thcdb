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
pub struct CorrectionSubmissionResult {
    pub correction_id: i32,
    pub entity_id: i32,
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
