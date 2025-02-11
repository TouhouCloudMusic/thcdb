use entity::user;
use sea_orm::{ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter};

use crate::pg_func_ext::PgFuncExt;

pub async fn update_user_last_login(
    user_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    user::Entity::update_many()
        .col_expr(user::Column::LastLogin, PgFuncExt::now().into())
        .filter(user::Column::Id.eq(user_id))
        .exec(db)
        .await?;

    Ok(())
}
