use entity::enums::EntityType;

mod diff;
mod model;

pub use diff::*;
pub use entity::enums::CorrectionStatus;
pub use model::*;

use super::user::User;

pub trait CorrectionEntity {
    fn entity_type() -> EntityType;
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

pub trait Repo {
    async fn find_one(
        &self,
        filter: CorrectionFilter,
    ) -> Result<Option<Correction>, Box<dyn std::error::Error + Send + Sync>>;

    async fn is_author(
        &self,
        user: &User,
        correction: &Correction,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>>;
}

pub trait TxRepo: Repo {
    async fn create(
        &self,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn update(
        &self,
        id: i32,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;

}
