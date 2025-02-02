use axum::extract::State;
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::{IntoResponse, Redirect, Response};
use axum::Json;
use axum_typed_multipart::TypedMultipart;
use utoipa::IntoResponses;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{IntoApiResponse, StatusCodeExt};
use crate::dto::user::{AuthCredential, UploadAvatar};
use crate::error::{AsErrorCode, ErrorCode, RepositoryError};
use crate::middleware::is_signed_in;
use crate::service::image::ImageService;
use crate::service::user::{AuthSession, Error, UserService, ValidateError};
use crate::{api_response, AppState};

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

const TAG: &str = "User";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(upload_avatar))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(sign_in))
        .routes(routes!(sign_up))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/signup",
    request_body = AuthCredential,
    responses(
        (status = 303),
        Error
    ),
)]
async fn sign_up(
    mut auth_session: AuthSession,
    State(user_service): State<UserService>,
    Json(AuthCredential { username, password }): Json<AuthCredential>,
) -> impl IntoResponse {
    match user_service.create(&username, &password).await {
        Ok(user) => match auth_session.login(&user).await {
            Ok(()) => Redirect::to("/").into_response(),
            Err(e) => match e {
                axum_login::Error::Session(err) => {
                    (StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
                        .into_response()
                }
                axum_login::Error::Backend(err) => err.into_response(),
            },
        },
        Err(e) => e.into_response(),
    }
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/signin",
    request_body = AuthCredential,
    responses(
        (status = 303),
        Error
    )
)]
async fn sign_in(
    auth_session: AuthSession,
    State(service): State<UserService>,
    Json(creds): Json<AuthCredential>,
) -> Result<Redirect, Error> {
    service
        .sign_in(auth_session, creds)
        .await
        .map(|()| Redirect::to("/"))
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
        Error
    )
)]
async fn upload_avatar(
    auth_session: AuthSession,
    State(user_service): State<UserService>,
    State(image_service): State<ImageService>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, Error> {
    if let Some(user) = auth_session.user {
        user_service
            .upload_avatar(image_service, user.id, form.data)
            .await
            .map(|()| api_response::msg("Upload successful").into_response())
    } else {
        Ok(Error::AuthenticationFailed.into_response())
    }
}
