use entity::{user, user_role};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveModel, QueryFilter,
};

use crate::domain::model::UserRoleEnum;
use crate::domain::user::{NewUser, User};

pub(crate) async fn find_by_id(
    conn: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<User>, DbErr> {
    let model = user::Entity::find()
        .filter(user::Column::Id.eq(id))
        .one(conn)
        .await?;

    match model {
        Some(model) => Ok(Some(load_user(conn, model).await?)),
        None => Ok(None),
    }
}

pub(crate) async fn find_by_name(
    conn: &impl ConnectionTrait,
    name: &str,
) -> Result<Option<User>, DbErr> {
    let model = user::Entity::find()
        .filter(user::Column::Name.eq(name))
        .one(conn)
        .await?;

    match model {
        Some(model) => Ok(Some(load_user(conn, model).await?)),
        None => Ok(None),
    }
}

pub(crate) async fn create_user(
    tx: &DatabaseTransaction,
    new_user: NewUser,
) -> Result<User, DbErr> {
    let model = user::Entity::insert(new_user.into_active_model())
        .exec_with_returning(tx)
        .await?;

    user_role::Entity::insert(user_role::ActiveModel {
        user_id: Set(model.id),
        role_id: Set(UserRoleEnum::User.into()),
    })
    .exec(tx)
    .await?;

    let mut user = User::from(model);
    user.roles = vec![UserRoleEnum::User.into()];

    Ok(user)
}

async fn load_user(
    conn: &impl ConnectionTrait,
    model: user::Model,
) -> Result<User, DbErr> {
    let roles = user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(model.id))
        .all(conn)
        .await?;

    let roles = roles
        .into_iter()
        .map(TryInto::try_into)
        .collect::<Result<Vec<_>, _>>()?;

    let mut user = User::from(model);
    user.roles = roles;

    Ok(user)
}
