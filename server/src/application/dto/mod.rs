#![expect(clippy::option_if_let_else, reason = "macro")]
use entity::enums::CorrectionType;
use serde::Deserialize;
use utoipa::ToSchema;

use crate::domain::correction::{CorrectionEntity, NewCorrection};
use crate::domain::user::User;

pub mod artist;
pub mod user;

#[derive(Deserialize, ToSchema)]
pub struct NewCorrectionDto<T>
where
    T: CorrectionEntity,
{
    pub data: T,
    pub description: String,
    pub r#type: CorrectionType,
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
