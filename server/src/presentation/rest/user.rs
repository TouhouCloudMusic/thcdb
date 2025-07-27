use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::{
    ArcAppState, AuthSession, {self},
};
use crate::application::auth::{
    AuthServiceTrait, SessionBackendError, SignInError, SignUpError,
};
use crate::application::user_image::{
    Error as UserImageError, UploadAvatar, UploadProfileBanner,
};
use crate::domain;
use crate::domain::model::auth::AuthCredential;
use crate::domain::model::markdown::{
    Markdown, {self},
};
use crate::domain::user::UserProfile;
use crate::infra::error::Error;
use crate::presentation::api_response::{self, Data, IntoApiResponse, Message};

const TAG: &str = "User";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(upload_profile_banner))
        .routes(routes!(upload_avatar))
        .routes(routes!(sign_out))
        .routes(routes!(profile))
        .routes(routes!(update_bio))
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
        Error
    ),
)]
async fn profile(
    CurrentUser(user): CurrentUser,
    State(service): State<state::UserProfileService>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    profile_impl(&service, &user.name, Some(&user)).await
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile/{name}",
    responses(
        (status = 200, body = DataUserProfile),
        (status = 404),
        Error
    ),
)]
async fn profile_with_name(
    session: AuthSession,
    State(use_case): State<state::UserProfileService>,
    Path(name): Path<String>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    profile_impl(&use_case, &name, session.user.as_ref()).await
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

    profile_impl(&use_case, &user.name, None).await
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/sign_in",
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

    profile_impl(&use_case, &user.name, None).await
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/sign_out",
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
    path = "/profile_banner",
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

async fn profile_impl(
    service: &state::UserProfileService,
    name: &str,
    current_user: Option<&domain::user::User>,
) -> Result<Data<UserProfile>, axum::response::Response> {
    let mut profile = service
        .find_by_name(name)
        .await
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| StatusCode::NOT_FOUND.into_response())?;

    if let Some(current_user) = current_user {
        service
            .with_following(&mut profile, current_user)
            .await
            .map_err(IntoResponse::into_response)?;
    }

    Ok(profile.into())
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
