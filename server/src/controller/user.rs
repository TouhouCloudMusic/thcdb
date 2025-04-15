use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message};
use crate::application::service::auth::{
    AuthServiceTrait, SessionBackendError, SignInError, SignUpError,
};
use crate::application::use_case::{self};
use crate::domain::model::auth::{AuthCredential, AuthnError};
use crate::domain::model::user::UserProfile;
use crate::dto::user::UploadAvatar;
use crate::error::{DbErrWrapper, ServiceError};
use crate::middleware::is_signed_in;
use crate::service::user::UploadAvatarError;
use crate::state::AuthSession;
use crate::{ArcAppState, api_response, domain, state};

const TAG: &str = "User";

pub fn router() -> OpenApiRouter<ArcAppState> {
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
    session: AuthSession,
    State(use_case): State<ProfileUseCase>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    if let Some(user) = session.user {
        profile_impl(&use_case, &user.name, Some(&user)).await
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
        SignUpError<DbErrWrapper>
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
        SignInError<DbErrWrapper>,
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
        .map_err(|e| SessionBackendError::from(e).into_response())?;

    profile_impl(&use_case, &user.name, None).await
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/sign_out",
    responses(
        (status = 200, body = Message),
        (status = 401),
        SessionBackendError<DbErrWrapper>,
    )
)]

async fn sign_out(
    mut session: AuthSession,
) -> Result<Message, SessionBackendError<DbErrWrapper>> {
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
    auth_session: AuthSession,
    State(user_service): State<state::UserService>,
    State(image_service): State<state::ImageService>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, UploadAvatarError> {
    if let Some(user) = auth_session.user {
        user_service
            .upload_avatar(&image_service, user.id, form.data)
            .await
            .map(|()| {
                api_response::Message::new("Upload successful").into_response()
            })
    } else {
        Ok(AuthnError::AuthenticationFailed.into_response())
    }
}

async fn profile_impl(
    use_case: &ProfileUseCase,
    name: &str,
    current_user: Option<&domain::model::user::User>,
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
