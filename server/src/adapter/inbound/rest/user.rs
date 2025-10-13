use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, AuthSession, {self},
};
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::{
    self, Data, IntoApiResponse, Message,
};
use crate::application::auth::{
    AuthServiceTrait, SessionBackendError, SignInError, SignUpError,
};
use crate::application::user_image::{
    Error as UserImageError, UploadAvatar, UploadProfileBanner,
};
use crate::domain::auth::AuthCredential;
use crate::domain::markdown::{self, Markdown};
use crate::domain::user::UserProfile;
use crate::feature::user::profile::{DataUserProfile, load_profile};
use crate::infra::error::Error;

const TAG: &str = "User";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(sign_in)).routes(routes!(sign_up)))
        .with_private(|r| {
            r.routes(routes!(upload_profile_banner))
                .routes(routes!(upload_avatar))
                .routes(routes!(sign_out))
                .routes(routes!(update_bio))
        })
        .finish()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign-up",
    request_body = AuthCredential,
    responses(
        (status = 200, body = DataUserProfile),
        SignUpError
    ),
)]
async fn sign_up(
    mut auth_session: AuthSession,
    State(use_case): State<state::UserProfileService>,
    State(auth_service): State<state::AuthService>,
    Json(creds): Json<AuthCredential>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    let user = auth_service
        .sign_up(creds)
        .await
        .map_err(IntoResponse::into_response)?;

    auth_session
        .login(&user)
        .await
        .map_err(|e| SessionBackendError::from(e).into_response())?;

    load_profile(&use_case, &user.name, None).await
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign-in",
    request_body = AuthCredential,
    responses(
        (status = 200, body = DataUserProfile),
        (status = 401),
        SignInError,
    )
)]
async fn sign_in(
    mut auth_session: state::AuthSession,
    State(use_case): State<state::UserProfileService>,
    Json(creds): Json<AuthCredential>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    if auth_session.user.is_some() {
        return Err(SignInError::already_signed_in().into_api_response());
    }
    let user = auth_session
        .authenticate(creds)
        .await
        .map_err(SessionBackendError::from)
        .map_err(IntoApiResponse::into_api_response)?
        .ok_or_else(|| StatusCode::UNAUTHORIZED.into_response())?;

    auth_session
        .login(&user)
        .await
        .map_err(SessionBackendError::from)
        .map_err(IntoResponse::into_response)?;

    load_profile(&use_case, &user.name, None).await
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/sign-out",
    responses(
        (status = 200, body = Message),
        (status = 401),
        SessionBackendError,
    )
)]

async fn sign_out(
    mut session: AuthSession,
) -> Result<Message, SessionBackendError> {
    Ok(session.logout().await.map(|_| Message::ok())?)
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
        UserImageError
    )
)]
async fn upload_avatar(
    CurrentUser(user): CurrentUser,
    State(service): State<state::UserImageService>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, UserImageError> {
    service
        .upload_avatar(user, &form.data.contents)
        .await
        .map(|()| {
            api_response::Message::new("Upload successful").into_response()
        })
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/profile-banner",
    request_body(
        content_type = "multipart/form-data",
        content = UploadProfileBanner,
    ),
    responses(
        (status = 200, body = api_response::Message),
        (status = 401),
        UserImageError
    )
)]
async fn upload_profile_banner(
    CurrentUser(user): CurrentUser,
    State(service): State<state::UserImageService>,
    TypedMultipart(form): TypedMultipart<UploadProfileBanner>,
) -> Result<impl IntoResponse, UserImageError> {
    service
        .upload_banner_image(user, &form.data.contents)
        .await
        .map(|_| {
            api_response::Message::new("Upload successful").into_response()
        })
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/profile/bio",
    request_body(content = String, content_type = "text/plain"),
    responses(
        (status = 200, body = api_response::Message),
        (status = 401),
        markdown::Error,
        Error
    )
)]
async fn update_bio(
    CurrentUser(user): CurrentUser,
    State(database): State<state::SeaOrmRepository>,
    text: String,
) -> Result<Message, impl IntoResponse> {
    use entity::user;
    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Set};

    let markdown =
        Markdown::parse(text).map_err(IntoResponse::into_response)?;

    user::Entity::update_many()
        .filter(user::Column::Id.eq(user.id))
        .set(user::ActiveModel {
            bio: Set(Some(markdown.to_string())),
            ..Default::default()
        })
        .exec(&database.conn)
        .await
        .map(|_| Message::new("Bio updated successfully"))
        .map_err(|e| Error::from(e).into_response())
}
