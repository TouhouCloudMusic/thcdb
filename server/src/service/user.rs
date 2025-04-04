use std::path::PathBuf;
use std::{env, str};

use argon2::password_hash;
use async_trait::async_trait;
use axum::body::Bytes;
use axum::http::StatusCode;
use axum_login::{AuthnBackend, UserId};
use axum_typed_multipart::FieldData;
use derive_more::{Display, Error, From};
use entity::{role, user, user_role};
use error_set::error_set;
use itertools::Itertools;
use macros::{ApiError, IntoErrorSchema};
use sea_orm::ActiveValue::*;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr,
    EntityTrait, IntoActiveModel, Iterable, PaginatorTrait, QueryFilter,
    TransactionTrait,
};

use crate::application::service::image::CreateError;
use crate::constant::ADMIN_USERNAME;
use crate::domain::service::image::AsyncImageStorage;
use crate::error::{DbErrWrapper, ErrorCode, InvalidField, ServiceError};
use crate::infrastructure::adapter::storage::image::LocalFileImageStorage;
use crate::infrastructure::adapter::{self};
use crate::model::auth::{
    AuthCredential, AuthnError, HasherError, UserRole, ValidateCredsError,
    hash_password,
};
use crate::model::lookup_table::LookupTableEnum;
use crate::utils::orm::PgFuncExt;
use crate::{application, domain};

pub type AuthSession = axum_login::AuthSession<Service>;

type CreateImageSerivceError = application::service::image::CreateError<
    <adapter::database::SeaOrmRepository as domain::repository::image::Repository>::Error,
    <LocalFileImageStorage as AsyncImageStorage>::CreateError,
    <LocalFileImageStorage as AsyncImageStorage>::RemoveError
>;

error_set! {
    #[derive(ApiError, From)]
    AuthnBackendError = {
        Authn(AuthnError),
        #[from(DbErr)]
        Service(ServiceError)
    };
    #[derive(ApiError, IntoErrorSchema)]
    SessionBackendError = {
        #[api_error(
            into_response = self
        )]
        Session(SessionError),
        AuthnBackend(AuthnBackendError)
    };
    #[derive(ApiError, IntoErrorSchema, From)]
    SignInError = {
        #[display("Already signed in")]
        #[api_error(
            status_code = StatusCode::CONFLICT,
            error_code = ErrorCode::AlreadySignedIn,
        )]
        AlreadySignedIn,
        Authn(AuthnError),
        #[from(axum_login::Error<Service>)]
        Session(SessionBackendError),
        Service(ServiceError)
    };
    #[derive(ApiError, IntoErrorSchema, From)]
    SignUpError = {
        Create(CreateUserError),
        Session(SessionBackendError),
        #[from(DbErr)]
        Service(ServiceError)
    };
    #[derive(IntoErrorSchema, ApiError, From)]
    UploadAvatarError = {
        #[from(DbErr)]
        DbErr(DbErrWrapper),
        // TODO: Impl api error trait
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            error_code = ErrorCode::InternalServerError,
            into_response = self
        )]
        #[display("{}", ErrorCode::InternalServerError.message())]
        ImageService(CreateImageSerivceError),
        #[api_error(
            into_response = self
        )]
        InvalidField(InvalidField),
    };
    #[derive(ApiError, IntoErrorSchema, From)]
    CreateUserError = {
        #[display("Username already in use")]
        #[api_error(
            status_code = StatusCode::CONFLICT,
            error_code = ErrorCode::UsernameAlreadyInUse
        )]
        UsernameAlreadyInUse,
        #[api_error(
            into_response = self
        )]
        #[from(password_hash::Error)]
        Hash(HasherError),
        #[api_error(
            into_response = self
        )]
        Validate(ValidateCredsError),
        #[from(DbErr)]
        Service(ServiceError),
    };
}

#[derive(Debug, Display, ApiError, From, Error)]
#[display("Session error")]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    error_code = ErrorCode::InternalServerError,
    into_response = self
)]
pub struct SessionError(axum_login::tower_sessions::session::Error);

impl From<axum_login::Error<Service>> for SessionBackendError {
    fn from(value: axum_login::Error<Service>) -> Self {
        match value {
            axum_login::Error::Session(err) => Self::Session(SessionError(err)),
            axum_login::Error::Backend(err) => Self::AuthnBackend(err),
        }
    }
}

super::def_service!();

impl Service {
    // TODO: Move them to repository
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

    async fn create(
        &self,
        creds: AuthCredential,
    ) -> Result<user::Model, CreateUserError> {
        create_impl(creds, &self.db).await
    }

    pub async fn sign_up(
        &self,
        auth_session: &mut AuthSession,
        creds: AuthCredential,
    ) -> Result<(), SignUpError> {
        let user = self.create(creds).await?;

        match auth_session.login(&user).await {
            Ok(()) => Ok(()),
            Err(e) => Err(SessionBackendError::from(e).into()),
        }
    }

    pub async fn sign_in(
        &self,
        auth_session: &mut AuthSession,
        creds: AuthCredential,
    ) -> Result<(), SignInError> {
        if auth_session.user.is_some() {
            return Err(SignInError::AlreadySignedIn);
        }

        let user = match auth_session.authenticate(creds).await? {
            Some(user) => user,
            None => Err(AuthnError::AuthenticationFailed)?,
        };

        match auth_session.login(&user).await {
            Ok(()) => Ok(()),
            Err(e) => Err(SessionBackendError::from(e).into()),
        }
    }

    pub async fn sign_out(
        &self,
        mut auth_session: AuthSession,
    ) -> Result<(), SessionBackendError> {
        auth_session.logout().await?;

        Ok(())
    }

    pub async fn upload_avatar<R, S>(
        &self,
        image_service: &impl application::service::image::ServiceTrait<R, S>,
        user_id: i32,
        data: FieldData<Bytes>,
    ) -> Result<(), UploadAvatarError>
    where
        R: domain::repository::image::Repository,
        S: AsyncImageStorage,
        UploadAvatarError:
            From<CreateError<R::Error, S::CreateError, S::RemoveError>>,
    {
        if data
            .metadata
            .content_type
            .as_ref()
            .is_some_and(|ct| ct.starts_with("image/"))
        {
            let image = image_service.create(&data.contents, user_id).await?;

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

    pub async fn verify_credentials(
        &self,
        cred: AuthCredential,
    ) -> Result<Option<user::Model>, AuthnBackendError> {
        let user = self.find_by_name(&cred.username).await?;
        let password = user.as_ref().map(|u| u.password.as_str());

        cred.verify_credentials(password).await?;
        Ok(user)
    }

    pub async fn get_roles(
        &self,
        user_id: i32,
    ) -> Result<Vec<role::Model>, ServiceError> {
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

    if username_in_use(username, db).await? {
        return Err(CreateUserError::UsernameAlreadyInUse);
    }

    let password = creds.hashed_password()?;

    let user = user::ActiveModel {
        name: Set(username.to_owned()),
        password: Set(password.clone()),
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

async fn username_in_use(
    username: &str,
    db: &impl ConnectionTrait,
) -> Result<bool, DbErr> {
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

        if username_in_use(ADMIN_USERNAME, &tx).await? {
            user::Entity::update_many()
                .col_expr(user::Column::Password, Expr::value(password))
                .filter(user::Column::Name.eq(ADMIN_USERNAME))
                .exec(&tx)
                .await?;

            return Ok(());
        }

        let res = user::Entity::insert(user::ActiveModel {
            id: NotSet,
            name: Set(ADMIN_USERNAME.to_string()),
            password: Set(password),
            avatar_id: Set(None),
            last_login: Set(chrono::Local::now().into()),
        })
        .on_conflict(
            OnConflict::column(user::Column::Name)
                .update_columns(user::Column::iter())
                .to_owned(),
        )
        .exec_with_returning(&tx)
        .await?;

        user_role::Entity::insert(
            user_role::Model {
                user_id: res.id,
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
