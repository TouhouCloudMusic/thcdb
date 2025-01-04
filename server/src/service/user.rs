use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{
    PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
};
use argon2::{password_hash, Argon2};
use async_trait::async_trait;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum_login::{AuthnBackend, UserId};
use entity::user;
use error_set::error_set;
use once_cell::sync::Lazy;
use regex::Regex;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Alias, Query};
use sea_orm::{
    ActiveValue, ColumnTrait, ConnectionTrait, DatabaseBackend,
    DatabaseConnection, EntityTrait, QueryFilter,
};
use serde::Serialize;

use crate::api_response;
use crate::dto::user::SignIn;

pub static ARGON2_HASHER: Lazy<Argon2> = Lazy::new(Argon2::default);

pub type AuthSession = axum_login::AuthSession<UserService>;

error_set! {
    #[derive(Serialize, Clone)]
    Error = {
        #[display("User not found")]
        NotFound,
        #[display("Database error")]
        Database,
        #[display("Failed to create user")]
        Create,
        #[display("Invalid username or password")]
        AuthenticationFailed,
        #[serde(skip)]
        #[display("Task join error")]
        JoinError,
        Password(PasswordError),
        CreateUser(CreateUserError),
    };
    #[derive(Serialize, Clone)]
    PasswordError = {
        #[serde(skip)]
        #[display("Failed to hash password: {err}")]
        HashPassword {
            err: password_hash::errors::Error
        },
        #[serde(skip)]
        #[display("Failed to parse password: {err}")]
        ParsePassword {
            err: password_hash::errors::Error
        }
    };
    #[derive(Serialize, Clone)]
    CreateUserError = {
        #[display("Invalid username")]
        InvalidUserName,
        #[display("Password is too weak")]
        PasswordTooWeak,
    };
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let status_code = match self {
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::AuthenticationFailed => StatusCode::UNAUTHORIZED,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };

        api_response::err(status_code, self).into_response()
    }
}

#[derive(Default, Clone)]
pub struct UserService {
    database: DatabaseConnection,
}

impl UserService {
    pub const fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn is_exist(&self, username: &String) -> Result<bool, Error> {
        const ALIAS: &str = "is_exist";
        let query = Query::select()
            .expr_as(
                Expr::exists(
                    Query::select()
                        .expr(Expr::value(1))
                        .from(user::Entity)
                        .and_where(user::Column::Name.eq(username))
                        .to_owned(),
                ),
                Alias::new(ALIAS),
            )
            .to_owned();

        let stmt = DatabaseBackend::Postgres.build(&query);

        if let Ok(Some(result)) = self.database.query_one(stmt).await {
            if let Ok(is_exist) = result.try_get_by::<bool, &str>(ALIAS) {
                return Ok(is_exist);
            }
        }

        Err(Error::Database)
    }

    pub async fn create(
        &self,
        username: &str,
        password: &str,
    ) -> Result<user::Model, Error> {
        if !validate_username(username) {
            return Err(CreateUserError::InvalidUserName.into());
        }

        if !validate_password(password) {
            return Err(CreateUserError::PasswordTooWeak.into());
        }

        let password = hash_password(password)?;

        let new_user = user::ActiveModel {
            name: ActiveValue::Set(username.to_string()),
            password: ActiveValue::Set(password.to_string()),
            ..Default::default()
        };

        user::Entity::insert(new_user)
            .exec_with_returning(&self.database)
            .await
            .map_err(|_| Error::Create)
    }

    pub async fn verify_credentials(
        &self,
        username: &str,
        password: &str,
    ) -> Result<user::Model, Error> {
        let (user, password_hash) = match self.find_by_name(username).await {
            Ok(Some(u)) => {
                let password_hash = u.password.clone();
                (Some(u), password_hash)
            }
            Ok(None) => (
                None,
                // TODO: don't hard-code
                "$argon2id$v=19$m=15000,t=2,p=1$\
                gZiV/M1gPc22ElAH/Jh1Hw$\
                CWOrkoo7oJBQ/iyh7uJ0LO2aLEfrHwTWllSAxT0zRno"
                    .to_string(),
            ),
            Err(e) => return Err(e),
        };

        let verification_result =
            verify_password(password, &password_hash).await?;

        if verification_result && user.is_some() {
            #[allow(clippy::unnecessary_unwrap)]
            Ok(user.unwrap())
        } else {
            Err(Error::AuthenticationFailed)
        }
    }

    pub async fn find_by_id(
        &self,
        id: &i32,
    ) -> Result<Option<user::Model>, Error> {
        user::Entity::find()
            .filter(user::Column::Id.eq(*id))
            .one(&self.database)
            .await
            .map_err(|_| Error::Database)
    }

    pub async fn find_by_name(
        &self,
        username: &str,
    ) -> Result<Option<user::Model>, Error> {
        user::Entity::find()
            .filter(user::Column::Name.eq(username))
            .one(&self.database)
            .await
            .map_err(|e| {
                tracing::error!("{}", e);
                Error::Database
            })
    }
}

#[async_trait]
impl AuthnBackend for UserService {
    type User = user::Model;
    type Credentials = SignIn;
    type Error = Error;

    async fn authenticate(
        &self,
        SignIn { username, password }: Self::Credentials,
    ) -> Result<Option<Self::User>, Self::Error> {
        Ok(Some(self.verify_credentials(&username, &password).await?))
    }

    async fn get_user(
        &self,
        id: &UserId<Self>,
    ) -> Result<Option<Self::User>, Self::Error> {
        self.find_by_id(id).await
    }
}

fn validate_username(username: &str) -> bool {
    static USER_NAME_REGEX: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"^[\p{L}\p{N}_]{1,32}$").unwrap());

    if !USER_NAME_REGEX.is_match(username) {
        return false;
    }

    !username
        .chars()
        .any(|c| c.is_control() || c.is_whitespace())
}

fn validate_password(password: &str) -> bool {
    use zxcvbn::{zxcvbn, Score};

    let result = zxcvbn(password, &[]);

    matches!(result.score(), Score::Four | Score::Three)
}

async fn verify_password(
    password: &str,
    password_hash: &str,
) -> Result<bool, Error> {
    let bytes = password.as_bytes().to_owned();
    let password_hash = password_hash.to_string();
    tokio::task::spawn_blocking(move || {
        let hash = PasswordHash::new(&password_hash)
            .map_err(|err| PasswordError::ParsePassword { err })?;

        Ok(Argon2::default().verify_password(&bytes, &hash).is_ok())
    })
    .await
    .map_err(|e| {
        tracing::error!("{}", e);
        Error::JoinError
    })?
}

fn hash_password(password: &str) -> Result<String, PasswordError> {
    let salt = SaltString::generate(&mut OsRng);

    let password_hash = ARGON2_HASHER
        .hash_password(password.as_bytes(), &salt)
        .map_err(|err| PasswordError::HashPassword { err })?;

    Ok(password_hash.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_username() {
        let test_cases = [
            // 长度
            ("", false),
            (&"a".repeat(33), false),
            // 空格
            (" a ", false),
            ("a a", false),
            // 特殊字符
            ("😀", false),       // emoji
            (" ", false),        // 单个空格
            ("\n", false),       // 换行符
            ("\t", false),       // 制表符
            ("\u{200B}", false), // 零宽空格
            ("\u{00A0}", false), // 不间断空格
            ("alice_megatron", true),
            // 中文
            ("无蛋黄", true),
            ("憂鬱的臺灣烏龜", true),
            // 日文
            ("ひらがな", true),
            ("かたかな", true),
            ("カタカナ", true),
            // 韩文
            ("안녕하세요", true),
            ("사용자", true),
            // 西里尔字母
            ("пример", true),
            ("пользователь", true),
            // 德语字符
            ("müller", true),
            ("straße", true),
            // 阿拉伯字符
            ("مرحبا", true),
            ("مستخدم", true),
        ];

        for (username, expected) in test_cases {
            assert_eq!(validate_username(username), expected);
        }
    }
}
