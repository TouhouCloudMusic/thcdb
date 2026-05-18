use infra_db::SeaOrmTxRepo;
use sea_orm::{ActiveModelTrait, IntoActiveModel};

use crate::features::user::User;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(crate) async fn update(
    tx: &SeaOrmTxRepo,
    user: User,
) -> Result<User, DatabaseError> {
    let model = user
        .into_active_model()
        .update(tx.conn())
        .await
        .db_operation("update user")?;

    Ok(User::from(model))
}
