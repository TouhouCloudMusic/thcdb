use entity::{user, user_email_verification, user_role};
use sea_orm::ActiveValue::Set;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Func, OnConflict};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, IntoActiveModel, QueryFilter, QuerySelect,
};

use crate::domain::model::{UserRole, UserRoleEnum};
use crate::domain::user::{EmailVerification, NewUser, User};
use crate::features::auth::Email;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::BrokenEntityReference;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub(crate) enum CreateUserError {
    #[display("user already exists")]
    AlreadyExists,
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub(crate) enum EmailVerificationMutationError {
    #[display("{_0}")]
    BrokenReference(#[error(source)] BrokenEntityReference),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}

pub(crate) async fn find_by_id(
    conn: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<User>, DatabaseError> {
    let result: Result<Option<User>, DatabaseError> = async {
        let model = user::Entity::find()
            .filter(user::Column::Id.eq(id))
            .one(conn)
            .await
            .db_operation("load auth user by id")?;

        match model {
            Some(model) => Ok(Some(load_user(conn, model).await?)),
            None => Ok(None),
        }
    }
    .await;

    result.db_operation("find auth user by id")
}

pub(crate) async fn find_by_name(
    conn: &impl ConnectionTrait,
    name: &str,
) -> Result<Option<User>, DatabaseError> {
    let result: Result<Option<User>, DatabaseError> = async {
        let model = user::Entity::find()
            .filter(user::Column::Name.eq(name))
            .one(conn)
            .await
            .db_operation("load auth user by name")?;

        match model {
            Some(model) => Ok(Some(load_user(conn, model).await?)),
            None => Ok(None),
        }
    }
    .await;

    result.db_operation("find auth user by name")
}

pub(crate) async fn find_by_email(
    conn: &impl ConnectionTrait,
    email: &Email,
) -> Result<Option<User>, DatabaseError> {
    let result: Result<Option<User>, DatabaseError> = async {
        let model = user::Entity::find()
            .filter(
                Expr::expr(Func::lower(user::Column::Email.into_expr()))
                    .eq(email.as_str()),
            )
            .one(conn)
            .await
            .db_operation("load auth user by email")?;

        match model {
            Some(model) => Ok(Some(load_user(conn, model).await?)),
            None => Ok(None),
        }
    }
    .await;

    result.db_operation("find auth user by email")
}

pub(crate) async fn create_user(
    tx: &DatabaseTransaction,
    new_user: NewUser,
) -> Result<User, CreateUserError> {
    let result: Result<User, DbErr> = async {
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
    .await;

    match result {
        Ok(user) => Ok(user),
        Err(err) if is_unique_constraint_error(&err) => {
            Err(CreateUserError::AlreadyExists)
        }
        Err(err) => Err(DatabaseError::new(err)
            .db_operation("create auth user")
            .into()),
    }
}

pub(crate) async fn delete_user(
    tx: &DatabaseTransaction,
    user_id: i32,
) -> Result<(), DatabaseError> {
    let result: Result<(), DatabaseError> = async {
        // TODO: exists
        let deletable = user::Entity::find()
            .select_only()
            .expr(1)
            .filter(user::Column::Id.eq(user_id))
            .filter(user::Column::EmailVerified.eq(false))
            .into_tuple::<i32>()
            .one(tx)
            .await
            .db_operation("check unverified auth user is deletable")?
            .is_some();

        if !deletable {
            return Ok(());
        }

        let _ = user::Entity::delete_many()
            .filter(user::Column::Id.eq(user_id))
            .filter(user::Column::EmailVerified.eq(false))
            .exec(tx)
            .await
            .db_operation("delete unverified auth user row")?;

        Ok(())
    }
    .await;

    result.db_operation("delete unverified auth user")
}

pub(crate) async fn set_email_verification(
    conn: &impl ConnectionTrait,
    user_id: i32,
    hash: String,
    expires_at: chrono::DateTime<chrono::FixedOffset>,
    sent_at: chrono::DateTime<chrono::FixedOffset>,
) -> Result<User, EmailVerificationMutationError> {
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
    .db_operation("set auth email verification")?;

    let model = user::Entity::find_by_id(user_id)
        .one(conn)
        .await
        .db_operation("find auth user after setting email verification")?
        .ok_or_else(|| {
            EmailVerificationMutationError::BrokenReference(
                BrokenEntityReference {
                    entity: "auth user",
                    id: user_id,
                },
            )
        })?;

    load_user(conn, model)
        .await
        .db_operation("load auth user after setting email verification")
        .map_err(Into::into)
}

pub(crate) async fn increment_email_verification_failed_attempts(
    conn: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), EmailVerificationMutationError> {
    let res = user_email_verification::Entity::update_many()
        .col_expr(
            user_email_verification::Column::FailedAttempts,
            Expr::col(user_email_verification::Column::FailedAttempts).add(1),
        )
        .filter(user_email_verification::Column::UserId.eq(user_id))
        .exec(conn)
        .await
        .db_operation("increment auth email verification failed attempts")?;

    if res.rows_affected == 0 {
        return Err(EmailVerificationMutationError::BrokenReference(
            BrokenEntityReference {
                entity: "email verification",
                id: user_id,
            },
        ));
    }

    Ok(())
}

pub(crate) async fn set_email_verified(
    tx: &DatabaseTransaction,
    user_id: i32,
) -> Result<User, DatabaseError> {
    let result: Result<User, DatabaseError> = async {
        let model = user::ActiveModel {
            id: Set(user_id),
            email_verified: Set(true),
            ..Default::default()
        }
        .update(tx)
        .await
        .db_operation("update auth user email verified")?;

        let _ = user_email_verification::Entity::delete_by_id(user_id)
            .exec(tx)
            .await
            .db_operation("delete auth email verification after verify")?;

        load_user(tx, model).await
    }
    .await;

    result.db_operation("set auth email verified")
}

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
    .db_operation("set auth user password")?;

    Ok(())
}

pub(crate) async fn clear_email_verification(
    conn: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), DatabaseError> {
    let _ = user_email_verification::Entity::delete_by_id(user_id)
        .exec(conn)
        .await
        .db_operation("clear auth email verification")?;

    Ok(())
}

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
        .db_operation("clear auth email verification if hash matches")?;

    Ok(res.rows_affected != 0)
}

fn is_unique_constraint_error(err: &DbErr) -> bool {
    matches!(
        err,
        DbErr::Query(sea_orm::RuntimeErr::SqlxError(err))
            if err
                .as_database_error()
                .and_then(|db_err| db_err.constraint())
                .is_some()
    )
}

async fn load_user(
    conn: &impl ConnectionTrait,
    model: user::Model,
) -> Result<User, DatabaseError> {
    let roles = user_role::Entity::find()
        .filter(user_role::Column::UserId.eq(model.id))
        .all(conn)
        .await
        .db_operation("load auth user roles")?;

    let roles = roles
        .into_iter()
        .map(UserRole::try_from)
        .collect::<Result<Vec<_>, _>>()?;

    let mut user = User::from(model);
    user.roles = roles;

    if let Some(v) = user_email_verification::Entity::find_by_id(user.id)
        .one(conn)
        .await
        .db_operation("load auth user email verification")?
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
