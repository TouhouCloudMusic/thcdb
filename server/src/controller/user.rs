use axum::Json;
use axum::extract::Path;
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use macros::{use_service, use_session};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message};
use crate::dto::user::{UploadAvatar, UserProfile};
use crate::error::ServiceError;
use crate::middleware::is_signed_in;
use crate::model::auth::{AuthCredential, AuthnError};
use crate::service::user::{
    AuthSession, SessionBackendError, SignInError, SignUpError,
    UploadAvatarError,
};
use crate::utils::MapInto;
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
        ServiceError
    ),
)]
#[use_service(user)]
async fn profile(
    Path(name): Path<String>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    user_service
        .profile(&name)
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
        (status = 200, body = Data<UserProfile>),
        SignUpError
    ),
)]
#[use_service(user)]
async fn sign_up(
    auth_session: AuthSession,
    Json(creds): Json<AuthCredential>,
) -> Result<Data<UserProfile>, SignUpError> {
    user_service.sign_up(auth_session, creds).await.map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign_in",
    request_body = AuthCredential,
    responses(
        (status = 200, body = Data<UserProfile>),
        SignInError,
    )
)]
#[use_service(user)]
async fn sign_in(
    auth_session: AuthSession,
    Json(creds): Json<AuthCredential>,
) -> Result<Data<UserProfile>, SignInError> {
    user_service.sign_in(auth_session, creds).await.map_into()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/sign_out",
    responses(
        (status = 200, body = Message),
        (status = 401),
        SessionBackendError
    )
)]
#[use_service(user)]
#[use_session]
async fn sign_out() -> Result<Message, SessionBackendError> {
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
        Ok(AuthnError::AuthenticationFailed.into_response())
    }
}
