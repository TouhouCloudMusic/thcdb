use entity::enums::EntityType;

mod diff;
mod model;

pub use diff::*;
pub use entity::enums::CorrectionStatus;
pub use model::*;

use super::model::CorrectionApprover;
use super::user::User;
use crate::infra;
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

pub trait ApproveCorrectionContext: Send + Sync {
    type ArtistRepo: super::artist::TxRepo;
    type ReleaseRepo: super::release::TxRepo;
    type SongRepo: super::song::TxRepo;
    type LabelRepo: super::label::TxRepo;
    type EventRepo: super::event::TxRepo;
    type TagRepo: super::tag::TxRepo;
    type SongLyricsRepo: super::song_lyrics::TxRepo;
    type CreditRoleRepo: super::credit_role::TxRepo;

    fn artist_repo(self) -> Self::ArtistRepo;
    fn release_repo(self) -> Self::ReleaseRepo;
    fn song_repo(self) -> Self::SongRepo;
    fn label_repo(self) -> Self::LabelRepo;
    fn event_repo(self) -> Self::EventRepo;
    fn tag_repo(self) -> Self::TagRepo;
    fn song_lyrics_repo(self) -> Self::SongLyricsRepo;
    fn credit_role_repo(self) -> Self::CreditRoleRepo;
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

    async fn approve<Ctx>(
        &self,
        correction_id: i32,
        approver: CorrectionApprover,
        context: Ctx,
    ) -> Result<(), infra::Error>
    where
        Ctx: ApproveCorrectionContext;
}

pub trait CorrectionEntityRepo<T>
where
    T: CorrectionEntity,
{
    async fn create(&self, data: &T) -> Result<i32, Error>;

    async fn create_history(&self, data: &T) -> Result<i32, Error>;
}
