use entity::enums::EntityType;

pub mod model;

pub use entity::enums::CorrectionStatus;
pub use model::*;

use super::model::auth::CorrectionApprover;
use super::repository::{Connection, Transaction};
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

pub trait ApproveCorrectionContext: Send + Sync
where
    infra::Error: From<<Self::ArtistRepo as Connection>::Error>
        + From<<Self::ReleaseRepo as Connection>::Error>
        + From<<Self::SongRepo as Connection>::Error>
        + From<<Self::LabelRepo as Connection>::Error>
        + From<<Self::EventRepo as Connection>::Error>
        + From<<Self::TagRepo as Connection>::Error>
        + From<<Self::SongLyricsRepo as Connection>::Error>
        + From<<Self::CreditRoleRepo as Connection>::Error>,
{
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
    ) -> Result<(), Self::Error>;

    async fn update(
        &self,
        id: i32,
        meta: NewCorrectionMeta<impl CorrectionEntity>,
    ) -> Result<(), Self::Error>;

    async fn approve<Ctx>(
        &self,
        correction_id: i32,
        approver: CorrectionApprover,
        context: Ctx,
    ) -> Result<(), infra::Error>
    where
        Ctx: ApproveCorrectionContext,
        infra::Error: From<<Ctx::ArtistRepo as Connection>::Error>
            + From<<Ctx::ReleaseRepo as Connection>::Error>
            + From<<Ctx::SongRepo as Connection>::Error>
            + From<<Ctx::LabelRepo as Connection>::Error>
            + From<<Ctx::EventRepo as Connection>::Error>
            + From<<Ctx::TagRepo as Connection>::Error>
            + From<<Ctx::SongLyricsRepo as Connection>::Error>
            + From<<Ctx::CreditRoleRepo as Connection>::Error>;
}

pub trait CorrectionEntityRepo<T>: Transaction
where
    T: CorrectionEntity,
{
    async fn create(&self, data: &T) -> Result<i32, Error>;

    async fn create_history(&self, data: &T) -> Result<i32, Error>;
}
