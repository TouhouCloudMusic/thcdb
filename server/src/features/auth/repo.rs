use entity::{user, user_email_verification, user_role};
use sea_orm::ActiveValue::Set;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Func, OnConflict};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, IntoActiveModel, QueryFilter, QuerySelect,
};

use crate::domain::model::UserRoleEnum;
use crate::domain::user::{EmailVerification, NewUser, User};
use crate::features::auth::Email;

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

// TODO: Use infra::Error
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

pub(crate) async fn find_by_email(
    conn: &impl ConnectionTrait,
    email: &Email,
) -> Result<Option<User>, DbErr> {
    let model = user::Entity::find()
        .filter(
            Expr::expr(Func::lower(user::Column::Email.into_expr()))
                .eq(email.as_str()),
        )
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

pub(crate) async fn delete_user(
    tx: &DatabaseTransaction,
    user_id: i32,
) -> Result<(), DbErr> {
    // TODO: exists
    let deletable = user::Entity::find()
        .select_only()
        .expr(1)
        .filter(user::Column::Id.eq(user_id))
        .filter(user::Column::EmailVerified.eq(false))
        .into_tuple::<i32>()
        .one(tx)
        .await?
        .is_some();

    if !deletable {
        return Ok(());
    }

    let _ = user::Entity::delete_many()
        .filter(user::Column::Id.eq(user_id))
        .filter(user::Column::EmailVerified.eq(false))
        .exec(tx)
        .await?;

    Ok(())
}

pub(crate) async fn set_email_verification(
    conn: &impl ConnectionTrait,
    user_id: i32,
    hash: String,
    expires_at: chrono::DateTime<chrono::FixedOffset>,
    sent_at: chrono::DateTime<chrono::FixedOffset>,
) -> Result<User, DbErr> {
    user_email_verification::Entity::insert(
        user_email_verification::ActiveModel {
            user_id: Set(user_id),
            hash: Set(hash),
            expires_at: Set(expires_at),
            sent_at: Set(sent_at),
            failed_attempts: Set(0),
        },
    )
    .on_conflict(
        OnConflict::column(user_email_verification::Column::UserId)
            .update_columns([
                user_email_verification::Column::Hash,
                user_email_verification::Column::ExpiresAt,
                user_email_verification::Column::SentAt,
                user_email_verification::Column::FailedAttempts,
            ])
            .to_owned(),
    )
    .exec(conn)
    .await?;

    let model = user::Entity::find_by_id(user_id)
        .one(conn)
        .await?
        .ok_or_else(|| DbErr::Custom("user not found".to_string()))?;

    load_user(conn, model).await
}

pub(crate) async fn increment_email_verification_failed_attempts(
    conn: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), DbErr> {
    let res = user_email_verification::Entity::update_many()
        .col_expr(
            user_email_verification::Column::FailedAttempts,
            Expr::col(user_email_verification::Column::FailedAttempts).add(1),
        )
        .filter(user_email_verification::Column::UserId.eq(user_id))
        .exec(conn)
        .await?;

    if res.rows_affected == 0 {
        // TODO: better error
        return Err(DbErr::RecordNotFound(
            "email verification not found".to_string(),
        ));
    }

    Ok(())
}

pub(crate) async fn set_email_verified(
    tx: &DatabaseTransaction,
    user_id: i32,
) -> Result<User, DbErr> {
    let model = user::ActiveModel {
        id: Set(user_id),
        email_verified: Set(true),
        ..Default::default()
    }
    .update(tx)
    .await?;

    clear_email_verification(tx, user_id).await?;

    load_user(tx, model).await
}

pub(crate) async fn set_password(
    conn: &impl ConnectionTrait,
    user_id: i32,
    password_hash: String,
) -> Result<(), DbErr> {
    user::ActiveModel {
        id: Set(user_id),
        password: Set(password_hash),
        ..Default::default()
    }
    .update(conn)
    .await?;

    Ok(())
}

pub(crate) async fn clear_email_verification(
    conn: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), DbErr> {
    let _ = user_email_verification::Entity::delete_by_id(user_id)
        .exec(conn)
        .await?;

    Ok(())
}

pub(crate) async fn clear_email_verification_if_hash_matches(
    conn: &impl ConnectionTrait,
    user_id: i32,
    hash: &str,
) -> Result<bool, DbErr> {
    let res = user_email_verification::Entity::delete_many()
        .filter(user_email_verification::Column::UserId.eq(user_id))
        .filter(user_email_verification::Column::Hash.eq(hash))
        .exec(conn)
        .await?;

    Ok(res.rows_affected != 0)
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

    if let Some(v) = user_email_verification::Entity::find_by_id(user.id)
        .one(conn)
        .await?
    {
        user.email_verification = Some(EmailVerification {
            hash: v.hash,
            expires_at: v.expires_at,
            sent_at: v.sent_at,
            failed_attempts: v.failed_attempts,
        });
    }

    Ok(user)
}
