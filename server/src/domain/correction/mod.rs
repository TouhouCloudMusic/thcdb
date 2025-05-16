use entity::enums::{CorrectionStatus, EntityType};

pub mod model;

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

pub trait Repo: super::repository::Connection {
    async fn find_one(
        &self,
        filter: CorrectionFilter,
    ) -> Result<Option<Correction>, Self::Error>;

    async fn is_author(
        &self,
        user: &User,
        correction: &Correction,
    ) -> Result<bool, Self::Error>;
}

pub trait TxRepo: Repo {
    async fn create(
        &self,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<(), Self::Error>;

    async fn update(
        &self,
        id: i32,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<(), Self::Error>;
}
