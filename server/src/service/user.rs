use std::path::PathBuf;
use std::{env, str};

use argon2::password_hash;
use async_trait::async_trait;
use axum::body::Bytes;
use axum::http::StatusCode;
use axum_login::{AuthnBackend, UserId};
use axum_typed_multipart::FieldData;
use entity::{role, user, user_role};
use error_set::error_set;
use itertools::Itertools;
use macros::{ApiError, FromDbErr, IntoErrorSchema};
use sea_orm::ActiveValue::*;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr,
    EntityTrait, IntoActiveModel, Iterable, PaginatorTrait, QueryFilter,
    TransactionTrait,
};

use super::*;
use crate::api_response::StatusCodeExt;
use crate::domain::auth::{
    AuthCredential, AuthnError, HasherError, ValidateCredsError, hash_password,
};
use crate::dto::user::UserProfile;
use crate::error::{
    ApiErrorTrait, AsErrorCode, DbErrWrapper, ErrorCode, InvalidField,
    RepositoryError,
};
use crate::model::lookup_table::LookupTableEnum;
use crate::model::user_role::UserRole;
use crate::utils::orm::PgFuncExt;

pub type AuthSession = axum_login::AuthSession<Service>;

error_set! {
    #[derive(ApiError)]
    AuthnBackendError = {
        Authn(AuthnError),
        Repo(RepositoryError)
    };
    #[derive(ApiError, IntoErrorSchema)]
    SessionBackendError = {
        Session(SessionError),
        AuthnBackend(AuthnBackendError)
    };
    #[derive(ApiError, IntoErrorSchema)]
    SignInError = {
        #[display("Already signed in")]
        #[api_error(
            status_code = StatusCode::CONFLICT,
            error_code = ErrorCode::AlreadySignedIn,
        )]
        AlreadySignedIn,
        Authn(AuthnError),
        Session(SessionBackendError),
    };
    #[derive(ApiError, IntoErrorSchema)]
    SignUpError = {
        Create(CreateUserError),
        Session(SessionBackendError),
    };
    #[derive(IntoErrorSchema, FromDbErr, ApiError)]
    UploadAvatarError = {
        DbErr(DbErrWrapper),
        CreateImageError(super::image::CreateError),
        InvalidField(InvalidField)
    };
    #[derive(ApiError, IntoErrorSchema)]
    CreateUserError = {
        #[display("Username already in use")]
        #[api_error(
            status_code = StatusCode::CONFLICT,
            error_code = ErrorCode::UsernameAlreadyInUse
        )]
        UsernameAlreadyInUse,
        Hash(HasherError),
        Validate(ValidateCredsError),
        Repo(RepositoryError),
    };
}

#[derive(Debug, derive_more::Display)]
#[display("Session error")]
pub struct SessionError(axum_login::tower_sessions::session::Error);

impl From<axum_login::tower_sessions::session::Error> for SessionError {
    fn from(value: axum_login::tower_sessions::session::Error) -> Self {
        Self(value)
    }
}

impl StatusCodeExt for SessionError {
    fn as_status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [StatusCode::INTERNAL_SERVER_ERROR].into_iter()
    }
}

impl AsErrorCode for SessionError {
    fn as_error_code(&self) -> crate::error::ErrorCode {
        ErrorCode::InternalServerError
    }
}

impl ApiErrorTrait for SessionError {}

impl std::error::Error for SessionError {}

impl From<DbErr> for AuthnBackendError {
    fn from(value: DbErr) -> Self {
        Self::Repo(value.into())
    }
}

impl From<DbErr> for CreateUserError {
    fn from(value: DbErr) -> Self {
        Self::Repo(value.into())
    }
}

impl From<password_hash::Error> for CreateUserError {
    fn from(value: password_hash::Error) -> Self {
        Self::Hash(value.into())
    }
}

impl From<axum_login::Error<Service>> for SessionBackendError {
    fn from(value: axum_login::Error<Service>) -> Self {
        match value {
            axum_login::Error::Session(err) => Self::Session(SessionError(err)),
            axum_login::Error::Backend(err) => Self::AuthnBackend(err),
        }
    }
}

impl From<axum_login::Error<Service>> for SignInError {
    fn from(value: axum_login::Error<Service>) -> Self {
        Self::Session(value.into())
    }
}

super::def_service!();

impl Service {
    pub async fn find_by_id(
        &self,
        id: &i32,
    ) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find()
            .filter(user::Column::Id.eq(*id))
            .one(&self.db)
            .await
    }

    pub async fn find_by_name(
        &self,
        username: &str,
    ) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find()
            .filter(user::Column::Name.eq(username))
            .one(&self.db)
            .await
    }

    pub async fn profile(
        &self,
        username: String,
    ) -> Result<Option<UserProfile>, RepositoryError> {
        if let Some((user, avatar)) = user::Entity::find()
            .filter(user::Column::Name.eq(username))
            .find_also_related(entity::image::Entity)
            .one(&self.db)
            .await?
        {
            let roles = user_role::Entity::find()
                .filter(user_role::Column::UserId.eq(user.id))
                .all(&self.db)
                .await?;

            let avatar_url = avatar.map(|a| {
                PathBuf::from_iter([&a.directory, &a.filename])
                    .to_str()
                    // String from database are valid unicode so unwrap is safe
                    .unwrap()
                    .to_string()
            });

            let profile = UserProfile {
                name: user.name,
                avatar_url,
                last_login: user.last_login.into(),
                roles: roles.into_iter().map(|x| x.role_id).collect(),
            };

            Ok(profile.into())
        } else {
            Ok(None)
        }
    }

    pub async fn create(
        &self,
        creds: AuthCredential,
    ) -> Result<user::Model, CreateUserError> {
        create_impl(creds, &self.db).await
    }

    pub async fn is_username_in_use(
        &self,
        username: &str,
    ) -> Result<bool, RepositoryError> {
        let user = user::Entity::find()
            .filter(user::Column::Name.eq(username))
            .count(&self.db)
            .await?;
        Ok(user > 0)
    }

    pub async fn verify_credentials(
        &self,
        cred: AuthCredential,
    ) -> Result<Option<user::Model>, AuthnBackendError> {
        let user = self.find_by_name(&cred.username).await?;
        let password = user.as_ref().map(|u| u.password.as_str());

        cred.verify_credentials(password).await?;
        Ok(user)
    }

    pub async fn sign_in(
        &self,
        mut auth_session: AuthSession,
        creds: AuthCredential,
    ) -> Result<(), SignInError> {
        if auth_session.user.is_some() {
            return Err(SignInError::AlreadySignedIn);
        }

        let user = match auth_session.authenticate(creds).await? {
            Some(user) => user,
            None => Err(AuthnError::AuthenticationFailed)?,
        };

        auth_session.login(&user).await?;

        Ok(())
    }

    pub async fn sign_out(
        &self,
        mut auth_session: AuthSession,
    ) -> Result<(), SessionBackendError> {
        auth_session.logout().await?;
        Ok(())
    }

    pub async fn upload_avatar(
        &self,
        image_service: image::Service,
        user_id: i32,
        data: FieldData<Bytes>,
    ) -> Result<(), UploadAvatarError> {
        if data
            .metadata
            .content_type
            .as_ref()
            .is_some_and(|ct| ct.starts_with("image/"))
        {
            let image = image_service.create(data.contents, user_id).await?;

            user::Entity::update_many()
                .filter(user::Column::Id.eq(user_id))
                .col_expr(user::Column::AvatarId, Expr::value(image.id))
                .exec(&self.db)
                .await?;
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
        let res = user_role::Entity::find()
            .filter(user_role::Column::UserId.eq(user_id))
            .find_also_related(role::Entity)
            .all(&self.db)
            .await?;

        let res = res.into_iter().filter_map(|x| x.1).collect_vec();

        Ok(res)
    }
}

async fn create_impl(
    creds: AuthCredential,
    db: &DatabaseConnection,
) -> Result<user::Model, CreateUserError> {
    creds.validate()?;

    let AuthCredential { username, .. } = &creds;

    if is_username_in_use(username, db).await? {
        return Err(CreateUserError::UsernameAlreadyInUse);
    }

    let password = creds.hashed_password()?;

    let user = user::ActiveModel {
        name: Set(username.to_owned()),
        password: Set(password.to_owned()),
        ..Default::default()
    }
    .insert(db)
    .await?;

    user_role::Entity::insert(
        user_role::Model {
            user_id: user.id,
            role_id: UserRole::User.as_id(),
        }
        .into_active_model(),
    )
    .exec(db)
    .await?;

    Ok(user)
}

pub async fn is_username_in_use(
    username: &str,
    db: &impl ConnectionTrait,
) -> Result<bool, RepositoryError> {
    let user = user::Entity::find()
        .filter(user::Column::Name.eq(username))
        .count(db)
        .await?;

    Ok(user > 0)
}

pub async fn update_last_login(
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

pub async fn upsert_admin_acc(db: &DatabaseConnection) {
    let password = hash_password(
        &env::var("ADMIN_PASSWORD").expect("Env var ADMIN_PASSWORD is not set"),
    )
    .unwrap();

    async {
        let tx = db.begin().await?;
        user::Entity::insert(
            user::Model {
                id: 1,
                name: "Admin".into(),
                password,
                avatar_id: None,
                last_login: chrono::Local::now().into(),
            }
            .into_active_model(),
        )
        .on_conflict(
            OnConflict::column(user::Column::Id)
                .update_columns(user::Column::iter())
                .to_owned(),
        )
        .exec(&tx)
        .await?;

        user_role::Entity::insert(
            user_role::Model {
                user_id: 1,
                role_id: UserRole::Admin.as_id(),
            }
            .into_active_model(),
        )
        .on_conflict_do_nothing()
        .exec(&tx)
        .await?;

        tx.commit().await
    }
    .await
    .expect("Failed to upsert admin account");
}

fn get_avatar_url(model: &entity::image::Model) -> String {
    PathBuf::from_iter([&model.directory, &model.filename])
        .to_str()
        // String from database are valid unicode so unwrap is safe
        .unwrap()
        .to_string()
}

#[async_trait]
impl AuthnBackend for Service {
    type User = user::Model;
    type Credentials = AuthCredential;
    type Error = AuthnBackendError;

    async fn authenticate(
        &self,
        creds: Self::Credentials,
    ) -> Result<Option<Self::User>, Self::Error> {
        self.verify_credentials(creds).await
    }

    async fn get_user(
        &self,
        user_id: &UserId<Self>,
    ) -> Result<Option<Self::User>, Self::Error> {
        let user = self.find_by_id(user_id).await?;

        if user.is_some() {
            update_last_login(*user_id, &self.db).await?;
        }

        Ok(user)
    }
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;

    #[test]
    fn get_avatar_url_test() {
        let model = entity::image::Model {
            id: Default::default(),
            directory: "ab/cd".into(),
            filename: "foobar.jpg".into(),
            uploaded_by: Default::default(),
            created_at: DateTime::default(),
        };

        assert_eq!(super::get_avatar_url(&model), "ab/cd/foobar.jpg");
    }
}
