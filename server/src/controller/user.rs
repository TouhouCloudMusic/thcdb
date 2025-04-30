use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{CurrentUser, TryState};
use crate::api_response::{Data, Message};
use crate::application::dto::user::{UploadAvatar, UploadProfileBanner};
use crate::application::service::UserImageServiceError;
use crate::application::service::auth::{
    AuthServiceTrait, SessionBackendError, SignInError, SignUpError,
};
use crate::application::use_case::{self};
use crate::domain::model::auth::AuthCredential;
use crate::domain::model::markdown::{self, Markdown};
use crate::domain::user::UserProfile;
use crate::error::{InfraError, ServiceError};
use crate::service::user::UploadAvatarError;
use crate::state::AuthSession;
use crate::{ArcAppState, api_response, domain, state};

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

type ProfileUseCase = use_case::user::Profile<state::SeaOrmRepository>;

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
async fn profile(
    CurrentUser(user): CurrentUser,
    State(use_case): State<ProfileUseCase>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    profile_impl(&use_case, &user.name, Some(&user)).await
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
    session: AuthSession,
    State(use_case): State<ProfileUseCase>,
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
    State(use_case): State<ProfileUseCase>,
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
    State(use_case): State<ProfileUseCase>,
    Json(creds): Json<AuthCredential>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    let user = auth_session
        .authenticate(creds)
        .await
        .map_err(SessionBackendError::from)
        .map_err(IntoResponse::into_response)?
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
        UploadAvatarError
    )
)]
async fn upload_avatar(
    CurrentUser(user): CurrentUser,
    State(user_service): State<state::UserService>,
    TryState(image_service): TryState<state::ImageService>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, UploadAvatarError> {
    user_service
        .upload_avatar(&image_service, user.id, form.data)
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
        UserImageServiceError
    )
)]
async fn upload_profile_banner(
    CurrentUser(user): CurrentUser,
    TryState(service): TryState<state::UserImageService>,
    TypedMultipart(form): TypedMultipart<UploadProfileBanner>,
) -> Result<impl IntoResponse, UserImageServiceError> {
    service
        .upload_banner_image(user, &form.data.contents)
        .await
        .map(|_| {
            api_response::Message::new("Upload successful").into_response()
        })
}

async fn profile_impl(
    use_case: &ProfileUseCase,
    name: &str,
    current_user: Option<&domain::user::User>,
) -> Result<Data<UserProfile>, axum::response::Response> {
    let mut profile = use_case
        .find_by_name(name)
        .await
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| StatusCode::NOT_FOUND.into_response())?;

    if let Some(current_user) = current_user {
        use_case
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
        InfraError
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
        .map_err(|e| InfraError::from(e).into_response())
}
