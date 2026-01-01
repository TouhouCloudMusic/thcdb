use sea_orm::DbErr;

use crate::features::credit_role::model::NewCreditRole;
use crate::infra::database::sea_orm::credit_role as credit_role_impls;
use crate::infra::database::sea_orm::SeaOrmTxRepo;

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewCreditRole,
) -> Result<i32, DbErr> {
    Ok(credit_role_impls::create_credit_role(data, repo.conn())
        .await?
        .id)
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewCreditRole,
) -> Result<i32, DbErr> {
    Ok(credit_role_impls::create_credit_role_history(data, repo.conn())
        .await?
        .id)
}
