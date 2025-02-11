use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{
    PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
};
use argon2::{Argon2, password_hash};
use async_trait::async_trait;
use axum::body::Bytes;
use axum_login::{AuthnBackend, UserId};
use axum_typed_multipart::FieldData;
use entity::prelude::{Role, UserRole};
use entity::{role, user, user_role};
use error_set::error_set;
use itertools::Itertools;
use once_cell::sync::Lazy;
use regex::Regex;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Alias, Query};
use sea_orm::{
    ActiveValue, ColumnTrait, ConnectionTrait, DatabaseBackend, EntityName,
    EntityTrait, QueryFilter,
};

use super::*;
use crate::dto::user::AuthCredential;
use crate::error::{InvalidField, RepositoryError};
use crate::repo::user::update_user_last_login;

pub static ARGON2_HASHER: Lazy<Argon2> = Lazy::new(Argon2::default);

pub type AuthSession = axum_login::AuthSession<Service>;

error_set! {
    #[disable(From(RepositoryError))]
    Error = {
        General(RepositoryError),
        #[display("Already signed in")]
        AlreadySignedIn,
        #[display("Username already in use")]
        UsernameAlreadyInUse,
        #[display("Invalid username or password")]
        AuthenticationFailed,
        #[display("Session error")]
        Session(axum_login::tower_sessions::session::Error),
        #[display("Failed to hash password: {err}")]
        HashPasswordFailed {
            err: password_hash::errors::Error
        },
        #[display("Failed to parse password: {err}")]
        ParsePasswordFailed {
            err: password_hash::errors::Error
        },
        Validate(ValidateError),
    };
    ValidateError = {
        #[display("Invalid username")]
        InvalidUserName,
        #[display("Invalid Password")]
        InvalidPassword,
        #[display("Password is too weak")]
        PasswordTooWeak,
        #[display("Invalid avatar type")]
        InvalidImageType
    };
}

impl<T> From<T> for Error
where
    T: Into<RepositoryError>,
{
    fn from(err: T) -> Self {
        Self::General(err.into())
    }
}

impl From<axum_login::Error<Service>> for Error {
    fn from(err: axum_login::Error<Service>) -> Self {
        match err {
            axum_login::Error::Backend(err) => err,
            axum_login::Error::Session(err) => Self::Session(err),
        }
    }
}

super::def_service!();

impl Service {
    pub async fn is_exist(&self, username: &str) -> Result<bool, Error> {
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

        let result = self
            .db
            .query_one(stmt)
            .await?
            .ok_or_else(|| {
                Error::General(RepositoryError::EntityNotFound {
                    entity_name: user::Entity.table_name(),
                })
            })
            .map(|x| x.try_get::<bool>("", ALIAS))??;

        Ok(result)
    }

    pub async fn find_by_id(
        &self,
        id: &i32,
    ) -> Result<Option<user::Model>, Error> {
        Ok(user::Entity::find()
            .filter(user::Column::Id.eq(*id))
            .one(&self.db)
            .await?)
    }

    pub async fn find_by_name(
        &self,
        username: &str,
    ) -> Result<Option<user::Model>, Error> {
        Ok(user::Entity::find()
            .filter(user::Column::Name.eq(username))
            .one(&self.db)
            .await?)
    }

    pub async fn create(
        &self,
        username: &str,
        password: &str,
    ) -> Result<user::Model, Error> {
        validate_username(username)?;
        validate_password(password)?;

        if self.is_exist(username).await? {
            return Err(Error::UsernameAlreadyInUse);
        }

        let password = hash_password(password)?;

        let new_user = user::ActiveModel {
            name: ActiveValue::Set(username.to_string()),
            password: ActiveValue::Set(password.to_string()),
            ..Default::default()
        };

        Ok(user::Entity::insert(new_user)
            .exec_with_returning(&self.db)
            .await?)
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
            Ok(None) => (None, hash_password("dummyPassword")?),
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

    pub async fn sign_in(
        &self,
        mut auth_session: AuthSession,
        creds: AuthCredential,
    ) -> Result<(), Error> {
        if auth_session.user.is_some() {
            return Err(Error::AlreadySignedIn);
        }

        let user = match auth_session.authenticate(creds.clone()).await {
            Ok(Some(user)) => user,
            Ok(None) => return Err(Error::AuthenticationFailed),
            Err(err) => return Err(err.into()),
        };

        auth_session.login(&user).await?;

        Ok(())
    }

    pub async fn upload_avatar(
        &self,
        image_service: image::Service,
        user_id: i32,
        data: FieldData<Bytes>,
    ) -> Result<(), Error> {
        if data
            .metadata
            .content_type
            .as_ref()
            .is_some_and(|ct| ct.starts_with("image/"))
        {
            image_service.create(data.contents, user_id).await?;
        } else {
            Err(InvalidField {
                field: "data".into(),
                expected: "image/*".into(),
                accepted: format!(
                    "{:?}",
                    data.metadata
                        .content_type
                        .or_else(|| Some("Nothing".to_string()))
                ),
            })?;
        }

        Ok(())
    }

    pub async fn get_roles(
        &self,
        user_id: i32,
    ) -> Result<Vec<role::Model>, RepositoryError> {
        let res = UserRole::find()
            .filter(user_role::Column::UserId.eq(user_id))
            .find_also_related(Role)
            .all(&self.db)
            .await?;

        let res = res.into_iter().filter_map(|x| x.1).collect_vec();

        Ok(res)
        // let mut res = vec![user]
        //     .load_many_to_many(Role, UserRole, &self.db)
        //     .await?;

        // Ok(res.swap_remove(0))
    }

    // TODO: role enum
    pub async fn have_role(
        &self,
        user_id: i32,
        // TODO: seed data, role enum and validate database when server start up
        role: &str,
    ) -> Result<bool, RepositoryError> {
        Ok(self
            .get_roles(user_id)
            .await?
            .iter()
            .any(|m| m.name == role))
    }
}

#[async_trait]
impl AuthnBackend for Service {
    type User = user::Model;
    type Credentials = AuthCredential;
    type Error = Error;

    async fn authenticate(
        &self,
        AuthCredential { username, password }: Self::Credentials,
    ) -> Result<Option<Self::User>, Self::Error> {
        Ok(Some(self.verify_credentials(&username, &password).await?))
    }

    async fn get_user(
        &self,
        user_id: &UserId<Self>,
    ) -> Result<Option<Self::User>, Self::Error> {
        let user = self.find_by_id(user_id).await?;

        if user.is_some() {
            update_user_last_login(*user_id, &self.db).await?;
        }

        Ok(user)
    }
}

fn validate_username(username: &str) -> Result<(), ValidateError> {
    static USER_NAME_REGEX: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"^[\p{L}\p{N}_]{1,32}$").unwrap());

    if USER_NAME_REGEX.is_match(username)
        && !username
            .chars()
            .any(|c| c.is_control() || c.is_whitespace())
    {
        Ok(())
    } else {
        Err(ValidateError::InvalidUserName)
    }
}

fn validate_password(password: &str) -> Result<(), ValidateError> {
    use zxcvbn::{Score, zxcvbn};

    static USER_PASSWORD_REGEX: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"^[A-Za-z\d!@#$%^&*]{8,}$").unwrap());

    if USER_PASSWORD_REGEX.is_match(password) {
        let result = zxcvbn(password, &[]);

        #[cfg(test)]
        {
            println!("password: {password}, score: {}", result.score());
        }

        match result.score() {
            Score::Three | Score::Four => Ok(()),
            _ => Err(ValidateError::PasswordTooWeak),
        }
    } else {
        Err(ValidateError::InvalidPassword)
    }
}

async fn verify_password(
    password: &str,
    password_hash: &str,
) -> Result<bool, Error> {
    let bytes = password.as_bytes().to_owned();
    let password_hash = password_hash.to_string();
    tokio::task::spawn_blocking(move || {
        let hash = PasswordHash::new(&password_hash)
            .map_err(|err| Error::ParsePasswordFailed { err })?;

        Ok(Argon2::default().verify_password(&bytes, &hash).is_ok())
    })
    .await?
}

fn hash_password(password: &str) -> Result<String, Error> {
    let salt = SaltString::generate(&mut OsRng);

    // Should this be a singleton?
    let password_hash = ARGON2_HASHER
        .hash_password(password.as_bytes(), &salt)
        .map_err(|err| Error::HashPasswordFailed { err })?;

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
            assert_eq!(validate_username(username).is_ok(), expected);
        }
    }

    #[test]
    fn test_validate_password() {
        static TEST_CASE: [(&str, bool); 15] = [
            ("Password123!", false),
            ("SecurePass#2023", true),
            ("HelloWorld!1", true),
            ("weak", false),
            ("password", false),
            ("PASSWORD123", false),
            ("Pass!", false),
            ("12345678", false),
            ("!@#$%^&*", false),
            ("NoSpecialChar123", true),
            ("NoNumberHere!", true),
            ("nocapitals1!", true),
            ("NOLOWERCASE1!", true),
            ("m10KSGDckKrX38Vm", true),
            ("1KrIuT%gcemHwjwF", true),
        ];

        for (password, expected) in TEST_CASE {
            println!("password: {password}, expected: {expected}");
            assert_eq!(validate_password(password).is_ok(), expected);
        }
    }
}
