use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use macros::use_session;
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
use crate::{AppState, api_response, state};

const TAG: &str = "User";

pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(upload_avatar))
        .routes(routes!(sign_out))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(profile))
        .routes(routes!(profile_with_name))
        .routes(routes!(sign_in))
        .routes(routes!(sign_up))
}

super::data! {
    DataUserProfile, UserProfile
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile",
    responses(
        (status = 200, body = DataUserProfile),
        (status = 404),
        ServiceError
    ),
)]
#[use_session]
async fn profile(
    State(user_service): State<state::UserService>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    if let Some(user) = session.user {
        user_service
            .profile(&user.name)
            .await
            .map_err(IntoResponse::into_response)?
            .map_or_else(
                || Err(StatusCode::NOT_FOUND.into_response()),
                |user| Ok(user.into()),
            )
    } else {
        Err(StatusCode::NOT_FOUND.into_response())
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile/{name}",
    responses(
        (status = 200, body = DataUserProfile),
        (status = 404),
        ServiceError
    ),
)]
async fn profile_with_name(
    State(user_service): State<state::UserService>,
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
        (status = 200, body = DataUserProfile),
        SignUpError
    ),
)]
async fn sign_up(
    auth_session: AuthSession,
    State(user_service): State<state::UserService>,
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
        (status = 200, body = DataUserProfile),
        SignInError,
    )
)]
async fn sign_in(
    auth_session: AuthSession,
    State(user_service): State<state::UserService>,
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
#[use_session]
async fn sign_out(
    State(user_service): State<state::UserService>,
) -> Result<Message, SessionBackendError> {
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
async fn upload_avatar(
    auth_session: AuthSession,
    State(state): State<Arc<AppState>>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, UploadAvatarError> {
    if let Some(user) = auth_session.user {
        state
            .user_service
            .upload_avatar(&state.image_service, user.id, form.data)
            .await
            .map(|()| api_response::msg("Upload successful").into_response())
    } else {
        Ok(AuthnError::AuthenticationFailed.into_response())
    }
}
