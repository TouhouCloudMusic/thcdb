use entity::{user, user_email_verification, user_role};
use infra_db::DatabaseTransaction;
use sea_orm::ActiveValue::Set;
use sea_orm::prelude::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait,
    IntoActiveModel, QueryFilter, QuerySelect,
};
use sea_query::{Func, OnConflict};

use crate::features::auth::{Email, UserRole, UserRoleEnum};
use crate::features::user::{EmailVerification, NewUser, User};
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseFailure, DatabaseResultExt,
};

#[cfg(all(test, feature = "integration-test"))]
mod tests;

#[infra_db::observe("auth.find_by_id")]
pub(crate) async fn find_by_id(
    conn: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<User>, DatabaseError> {
    let model = user::Entity::find()
        .filter(user::Column::Id.eq(id))
        .one(conn)
        .await
        .db_context("load auth user by id")?;

    match model {
        Some(model) => Ok(Some(load_user(conn, model).await?)),
        None => Ok(None),
    }
}

#[infra_db::observe("auth.find_by_name")]
pub(crate) async fn find_by_name(
    conn: &impl ConnectionTrait,
    name: &str,
) -> Result<Option<User>, DatabaseError> {
    let model = user::Entity::find()
        .filter(user::Column::Name.eq(name))
        .one(conn)
        .await
        .db_context("load auth user by name")?;

    match model {
        Some(model) => Ok(Some(load_user(conn, model).await?)),
        None => Ok(None),
    }
}

#[infra_db::observe("auth.find_by_email")]
pub(crate) async fn find_by_email(
    conn: &impl ConnectionTrait,
    email: &Email,
) -> Result<Option<User>, DatabaseError> {
    let model = user::Entity::find()
        .filter(
            Expr::expr(Func::lower(user::Column::Email.into_expr()))
                .eq(email.as_str()),
        )
        .one(conn)
        .await
        .db_context("load auth user by email")?;

    match model {
        Some(model) => Ok(Some(load_user(conn, model).await?)),
        None => Ok(None),
    }
}

#[infra_db::observe("auth.create_user")]
pub(crate) async fn create_user(
    tx: &DatabaseTransaction,
    new_user: NewUser,
) -> Result<User, DatabaseError> {
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

#[infra_db::observe("auth.delete_user")]
pub(crate) async fn delete_user(
    tx: &DatabaseTransaction,
    user_id: i32,
) -> Result<(), DatabaseError> {
    // TODO: exists
    let deletable = user::Entity::find()
        .select_only()
        .expr(1)
        .filter(user::Column::Id.eq(user_id))
        .filter(user::Column::EmailVerified.eq(false))
        .into_tuple::<i32>()
        .one(tx)
        .await
        .db_context("check unverified auth user is deletable")?
        .is_some();

    if !deletable {
        return Ok(());
    }

    let _ = user::Entity::delete_many()
        .filter(user::Column::Id.eq(user_id))
        .filter(user::Column::EmailVerified.eq(false))
        .exec(tx)
        .await
        .db_context("delete unverified auth user row")?;

    Ok(())
}

#[infra_db::observe("auth.set_email_verification")]
pub(crate) async fn set_email_verification(
    conn: &impl ConnectionTrait,
    user_id: i32,
    hash: String,
    expires_at: chrono::DateTime<chrono::FixedOffset>,
    sent_at: chrono::DateTime<chrono::FixedOffset>,
) -> Result<User, DatabaseError> {
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
    .await
    .db_context("set auth email verification")?;

    let model = user::Entity::find_by_id(user_id)
        .one(conn)
        .await
        .db_context("find auth user after setting email verification")?
        .ok_or_else(|| {
            DatabaseFailure::broken_reference(BrokenEntityReference {
                entity: "auth user",
                id: user_id,
            })
        })?;

    let user = load_user(conn, model)
        .await
        .db_context("load auth user after setting email verification")?;
    Ok(user)
}

#[infra_db::observe("auth.increment_email_verification_failed_attempts")]
pub(crate) async fn increment_email_verification_failed_attempts(
    conn: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), DatabaseError> {
    let res = user_email_verification::Entity::update_many()
        .col_expr(
            user_email_verification::Column::FailedAttempts,
            Expr::col(user_email_verification::Column::FailedAttempts).add(1),
        )
        .filter(user_email_verification::Column::UserId.eq(user_id))
        .exec(conn)
        .await
        .db_context("increment auth email verification failed attempts")?;

    if res.rows_affected == 0 {
        return Err(DatabaseFailure::broken_reference(BrokenEntityReference {
            entity: "email verification",
            id: user_id,
        }));
    }

    Ok(())
}

#[infra_db::observe("auth.set_email_verified")]
pub(crate) async fn set_email_verified(
    tx: &DatabaseTransaction,
    user_id: i32,
) -> Result<User, DatabaseError> {
    let model = user::ActiveModel {
        id: Set(user_id),
        email_verified: Set(true),
        ..Default::default()
    }
    .update(tx)
    .await
    .db_context("update auth user email verified")?;

    let _ = user_email_verification::Entity::delete_by_id(user_id)
        .exec(tx)
        .await
        .db_context("delete auth email verification after verify")?;

    Ok(load_user(tx, model).await?)
}

#[infra_db::observe("auth.set_password")]
pub(crate) async fn set_password(
    conn: &impl ConnectionTrait,
    user_id: i32,
    password_hash: String,
) -> Result<(), DatabaseError> {
    user::ActiveModel {
        id: Set(user_id),
        password: Set(password_hash),
        ..Default::default()
    }
    .update(conn)
    .await
    .db_context("set auth user password")?;

    Ok(())
}

#[infra_db::observe("auth.clear_email_verification")]
pub(crate) async fn clear_email_verification(
    conn: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), DatabaseError> {
    let _ = user_email_verification::Entity::delete_by_id(user_id)
        .exec(conn)
        .await
        .db_context("clear auth email verification")?;

    Ok(())
}

#[infra_db::observe("auth.clear_email_verification_if_hash_matches")]
pub(crate) async fn clear_email_verification_if_hash_matches(
    conn: &impl ConnectionTrait,
    user_id: i32,
    hash: &str,
) -> Result<bool, DatabaseError> {
    let res = user_email_verification::Entity::delete_many()
        .filter(user_email_verification::Column::UserId.eq(user_id))
        .filter(user_email_verification::Column::Hash.eq(hash))
        .exec(conn)
        .await
        .db_context("clear auth email verification if hash matches")?;

    Ok(res.rows_affected != 0)
}

#[infra_db::observe("auth.load_user")]
async fn load_user(
    conn: &impl ConnectionTrait,
    model: user::Model,
) -> Result<User, DatabaseError> {
    let roles = user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(model.id))
        .all(conn)
        .await
        .db_context("load auth user roles")?;

    let roles = roles
        .into_iter()
        .map(UserRole::try_from)
        .collect::<Result<Vec<_>, _>>()?;

    let mut user = User::from(model);
    user.roles = roles;

    if let Some(v) = user_email_verification::Entity::find_by_id(user.id)
        .one(conn)
        .await
        .db_context("load auth user email verification")?
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
