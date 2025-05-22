use entity::enums::EntityType;

pub mod model;

pub use entity::enums::CorrectionStatus;
pub use model::*;

use super::model::auth::CorrectionApprover;
use super::repository::Transaction;
use super::user::User;
use crate::infra::error::Error;

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

pub trait ApproveCorrectionContext: Send + Sync {
    fn artist_repo(self) -> impl super::artist::TxRepo;
    fn release_repo(self) -> impl super::release::TxRepo;
    fn song_repo(self) -> impl super::song::TxRepo;
    fn label_repo(self) -> impl super::label::TxRepo;
    fn event_repo(self) -> impl super::event::TxRepo;
    fn tag_repo(self) -> impl super::tag::TxRepo;
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

    async fn approve(
        &self,
        correction_id: i32,
        approver: CorrectionApprover,
        context: impl ApproveCorrectionContext,
    ) -> Result<(), Error>;
}

pub trait CorrectionEntityRepo<T>: Transaction
where
    T: CorrectionEntity,
{
    async fn create(&self, data: &T) -> Result<i32, Error>;

    async fn create_history(&self, data: &T) -> Result<i32, Error>;
}
