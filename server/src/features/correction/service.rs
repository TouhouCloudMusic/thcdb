use crate::application::correction::Error as CorrectionError;
use crate::application::error::Unauthorized;
use crate::domain::model::CorrectionApprover;
use crate::domain::user::User;
use crate::infra;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::features::correction::repo;

pub async fn approve(
    repo: &SeaOrmRepository,
    correction_id: i32,
    user: User,
) -> Result<(), CorrectionError> {
    let approver =
        CorrectionApprover::from_user(user).ok_or_else(Unauthorized::new)?;
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;
    repo::approve(&tx_repo, correction_id, approver).await?;
    tx_repo
        .commit()
        .await
        .map_err(infra::Error::from)?;
    Ok(())
}
