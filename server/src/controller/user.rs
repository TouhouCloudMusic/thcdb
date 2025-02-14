use axum::Json;
use axum::extract::Path;
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::{IntoResponse, Response};
use axum_typed_multipart::TypedMultipart;
use itertools::Itertools;
use macros::{use_service, use_session};
use utoipa::IntoResponses;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, IntoApiResponse, Message, StatusCodeExt};
use crate::dto::user::{AuthCredential, UploadAvatar, UserProfile};
use crate::error::{
    ApiErrorTrait, AsErrorCode, ErrorCode, InvalidField, RepositoryError,
};
use crate::middleware::is_signed_in;
use crate::service::image::CreateError;
use crate::service::user::{
    AuthSession, Error, UploadAvatarError, ValidateError,
};
use crate::{AppState, api_response};

const TAG: &str = "User";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(upload_avatar))
        .routes(routes!(sign_out))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(profile))
        .routes(routes!(sign_in))
        .routes(routes!(sign_up))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile/{name}",
    responses(
        (status = 200, body = Data<UserProfile>),
        (status = 404),
        Error
    ),
)]
#[use_service(user)]
async fn profile(
    Path(name): Path<String>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    user_service
        .profile(name)
        .await
        .map_err(IntoResponse::into_response)?
        .map_or_else(
            || Err(StatusCode::NOT_FOUND.into_response()),
            |user| Ok(user.into()),
        )
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign_up",
    request_body = AuthCredential,
    responses(
        (status = 200, body = Message),
        Error
    ),
)]
#[use_service(user)]
async fn sign_up(
    mut auth_session: AuthSession,
    Json(AuthCredential { username, password }): Json<AuthCredential>,
) -> Result<Message, impl IntoResponse> {
    let user = user_service
        .create(&username, &password)
        .await
        .map_err(IntoResponse::into_response)?;

    match auth_session.login(&user).await {
        Ok(()) => Ok(Message::ok()),
        Err(e) => match e {
            axum_login::Error::Session(err) => {
                Err((StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
                    .into_response())
            }
            axum_login::Error::Backend(err) => Err(err.into_response()),
        },
    }
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign_in",
    request_body = AuthCredential,
    responses(
        (status = 200, body = Message),
        Error
    )
)]
#[use_service(user)]
async fn sign_in(
    auth_session: AuthSession,
    Json(creds): Json<AuthCredential>,
) -> Result<Message, Error> {
    user_service
        .sign_in(auth_session, creds)
        .await
        .map(|()| Message::ok())
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/sign_out",
    responses(
        (status = 200, body = Message),
        (status = 401),
        Error
    )
)]
#[use_service(user)]
#[use_session]
async fn sign_out() -> Result<Message, Error> {
    user_service.sign_out(session).await.map(|()| Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/avatar",
    request_body(
        content_type = "multipart/form-data",
        content = UploadAvatar,
    ),
    responses(
        (status = 200, body = api_response::Message),
        (status = 401),
        UploadAvatarError
    )
)]
#[use_service(user, image)]
#[axum::debug_handler(state = AppState)]
async fn upload_avatar(
    auth_session: AuthSession,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, UploadAvatarError> {
    if let Some(user) = auth_session.user {
        user_service
            .upload_avatar(image_service, user.id, form.data)
            .await
            .map(|()| api_response::msg("Upload successful").into_response())
    } else {
        Ok(Error::AuthenticationFailed.into_response())
    }
}

impl StatusCodeExt for UploadAvatarError {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::CreateImageError(err) => err.as_status_code(),
            Self::InvalidField(err) => err.as_status_code(),
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        CreateError::all_status_codes().chain(InvalidField::all_status_codes())
    }
}

impl AsErrorCode for UploadAvatarError {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::CreateImageError(err) => err.as_error_code(),
            Self::InvalidField(err) => err.as_error_code(),
        }
    }
}

impl ApiErrorTrait for UploadAvatarError {}

impl IntoResponse for UploadAvatarError {
    fn into_response(self) -> axum::response::Response {
        self.into_api_response()
    }
}

impl StatusCodeExt for Error {
    fn as_status_code(&self) -> StatusCode {
        match &self {
            Self::General(err) => err.as_status_code(),
            Self::AuthenticationFailed => StatusCode::UNAUTHORIZED,
            Self::AlreadySignedIn | Self::UsernameAlreadyInUse => {
                StatusCode::CONFLICT
            }
            Self::Session(_)
            | Self::HashPasswordFailed { .. }
            | Self::ParsePasswordFailed { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::Validate(_) => StatusCode::BAD_REQUEST,
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [
            StatusCode::UNAUTHORIZED,
            StatusCode::CONFLICT,
            StatusCode::INTERNAL_SERVER_ERROR,
            StatusCode::BAD_REQUEST,
        ]
        .into_iter()
        .chain(RepositoryError::all_status_codes())
        .unique()
    }
}

impl AsErrorCode for ValidateError {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::InvalidUserName => ErrorCode::InvalidUserName,
            Self::InvalidPassword => ErrorCode::InvalidPassword,
            Self::PasswordTooWeak => ErrorCode::PasswordTooWeak,
            Self::InvalidImageType => ErrorCode::InvalidImageType,
        }
    }
}

impl AsErrorCode for Error {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::General(e) => e.as_error_code(),
            Self::AlreadySignedIn => ErrorCode::AlreadySignedIn,
            Self::UsernameAlreadyInUse => ErrorCode::UsernameAlreadyInUse,
            Self::AuthenticationFailed => ErrorCode::AuthenticationFailed,
            Self::Session(_) => ErrorCode::SessionMiddlewareError,
            Self::HashPasswordFailed { .. } => ErrorCode::HashPasswordFailed,
            Self::ParsePasswordFailed { .. } => ErrorCode::ParsePasswordFailed,
            Self::Validate(e) => e.as_error_code(),
        }
    }
}

impl ApiErrorTrait for Error {}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::General(err) => err.into_response(),
            Self::Session(ref err) => {
                tracing::error!("Session error: {}", err);
                self.into_api_response()
            }
            _ => self.into_api_response(),
        }
    }
}

impl IntoResponses for Error {
    fn responses() -> std::collections::BTreeMap<
        String,
        utoipa::openapi::RefOr<utoipa::openapi::response::Response>,
    > {
        use crate::api_response::ErrResponseDef;
        Self::build_err_responses().into()
    }
}
