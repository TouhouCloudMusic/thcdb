use axum::extract::State;
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::{IntoResponse, Redirect, Response};
use axum::Json;
use axum_typed_multipart::TypedMultipart;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::dto::user::{AuthCredential, SignUp, UploadAvatar};
use crate::error::AsStatusCode;
use crate::middleware::is_signed_in;
use crate::service::image::ImageService;
use crate::service::user::{AuthSession, Error, UserService};
use crate::{api_response, AppState};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(upload_avatar))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(sign_in))
        .routes(routes!(sign_up))
}

impl AsStatusCode for Error {
    /// Error Codes:
    ///   - 400
    ///   - 401
    ///   - 409
    ///   - 500
    ///   - From [`crate::error::GeneralRepositoryError`]
    fn as_status_code(&self) -> StatusCode {
        match &self {
            Self::General(err) => err.as_status_code(),
            Self::AuthenticationFailed => StatusCode::UNAUTHORIZED,
            Self::AlreadySignedIn => StatusCode::CONFLICT,
            Self::Session(_)
            | Self::HashPasswordFailed { .. }
            | Self::ParsePasswordFailed { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::Validate(_) => StatusCode::BAD_REQUEST,
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::General(err) => err.into_response(),
            Self::Session(ref err) => {
                tracing::error!("Session error: {}", err);
                api_response::err(self.as_status_code(), self).into_response()
            }
            _ => api_response::err(self.as_status_code(), self).into_response(),
        }
    }
}

#[utoipa::path(
    post,
    path = "/signup",
    request_body = AuthCredential,
    tag = "user",
    responses(
        (status = 303),
        (status = 400, body = api_response::Error),
        (status = 401, body = api_response::Error),
        (status = 404, body = api_response::Error),
        (status = 409, body = api_response::Error),
        (status = 500, body = api_response::Error),
    ),
)]
async fn sign_up(
    mut auth_session: AuthSession,
    State(user_service): State<UserService>,
    Json(SignUp { username, password }): Json<SignUp>,
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
    path = "/signin",
    request_body = AuthCredential,
    responses(
        (status = 303),
        (status = 400, body = api_response::Error),
        (status = 401, body = api_response::Error),
        (status = 404, body = api_response::Error),
        (status = 409, body = api_response::Error),
        (status = 500, body = api_response::Error),
    )
)]
async fn sign_in(
    auth_session: AuthSession,
    State(service): State<UserService>,
    Json(creds): Json<AuthCredential>,
) -> impl IntoResponse {
    match service.sign_in(auth_session, creds).await {
        Ok(()) => Redirect::to("/").into_response(),
        Err(e) => e.into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/avatar",
    request_body(
        content_type = "multipart/form-data",
        content = UploadAvatar,
    ),
    responses(
        (status = 200, body = api_response::Message),
        // This is from auth middleware
        (status = 401)
    )
)]
async fn upload_avatar(
    auth_session: AuthSession,
    State(user_service): State<UserService>,
    State(image_service): State<ImageService>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> impl IntoResponse {
    if let Some(user) = auth_session.user {
        match user_service
            .upload_avatar(image_service, user.id, form.data)
            .await
        {
            Ok(()) => api_response::msg("Upload successful").into_response(),
            Err(e) => e.into_response(),
        }
    } else {
        StatusCode::UNAUTHORIZED.into_response()
    }
}
