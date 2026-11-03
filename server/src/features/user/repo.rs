use infra_db::SeaOrmTxRepo;
use sea_orm::{ActiveModelTrait, IntoActiveModel};

use crate::features::user::User;
use crate::infra::database::error::DatabaseError;

#[infra_db::observe("user.update")]
pub(crate) async fn update(
    tx: &SeaOrmTxRepo,
    user: User,
) -> Result<User, DatabaseError> {
    let model = user.into_active_model().update(tx.conn()).await?;

    Ok(User::from(model))
}
