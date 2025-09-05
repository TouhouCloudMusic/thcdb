use entity::enums::CorrectionStatus;
use eros::{IntoUnionResult, ReshapeUnionResult};

use super::error::Unauthorized;
use crate::domain::artist;
use crate::domain::artist::model::{NewArtist, ValidationError};
use crate::domain::artist::repo::Repo;
use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::repository::TransactionManager;
use crate::infra::error::InternalError;

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

impl<R, TR> Service<R>
where
    R: Repo + TransactionManager<TransactionRepository = TR>,
    TR: Clone + artist::TxRepo + correction::TxRepo,
    InternalError: From<R::Error> + From<TR::Error>,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewArtist>,
    ) -> eros::UnionResult<(), (InternalError, ValidationError)> {
        correction.data.validate().union()?;

        let tx_repo = self
            .repo
            .begin()
            .await
            .map_err(InternalError::from)
            .union()?;

        let entity_id = artist::TxRepo::create(&tx_repo, &correction.data)
            .await
            .map_err(InternalError::from)
            .union()?;

        let history_id = tx_repo
            .create_history(&correction.data)
            .await
            .map_err(InternalError::from)
            .union()?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create2(NewCorrectionMeta::<NewArtist> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                history_id,
                status: CorrectionStatus::Approved,
                description: correction.description,
                phantom: std::marker::PhantomData,
            })
            .await
            .union()?;

        correction_service
            .repo
            .commit()
            .await
            .map_err(InternalError::from)
            .union()?;

        Ok(())
    }

    pub async fn upsert_correction(
        &self,
        id: i32,
        correction: NewCorrection<NewArtist>,
    ) -> eros::UnionResult<(), (InternalError, ValidationError, Unauthorized)>
    {
        correction.data.validate().union()?;

        let tx_repo = self
            .repo
            .begin()
            .await
            .map_err(InternalError::from)
            .union()?;

        let history_id = tx_repo
            .create_history(&correction.data)
            .await
            .map_err(InternalError::from)
            .union()?;
        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .upsert2(NewCorrectionMeta::<NewArtist> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id: id,
                status: CorrectionStatus::Pending,
                history_id,
                description: correction.description,
                phantom: std::marker::PhantomData,
            })
            .await
            .widen()?;

        correction_service
            .repo
            .commit()
            .await
            .map_err(InternalError::from)
            .union()?;

        Ok(())
    }
}
