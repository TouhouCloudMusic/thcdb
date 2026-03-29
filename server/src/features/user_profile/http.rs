use axum::extract::{Path, State};
use axum::response::IntoResponse;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::domain;
use crate::domain::user::UserProfile;
use crate::features::user_profile::FollowResult;
use crate::shared::http::api_response::{Data, Message};

const TAG: &str = "User";

#[derive(ToSchema)]
pub struct DataUserProfile {
    status: String,
    #[schema(required = true)]
    data: UserProfile,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(profile_with_name)))
        .with_private(|r| {
            r.routes(routes!(profile))
                .routes(routes!(follow_user))
                .routes(routes!(unfollow_user))
        })
        .finish()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile",
    responses(
        (status = 200, body = DataUserProfile),
    ),
)]
async fn profile(
    CurrentUser(user): CurrentUser,
    State(service): State<state::UserProfileService>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    load_profile(&service, &user.name, Some(&user)).await
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/profile/{name}/follow",
    responses(
        (status = 200, body = Message),
    ),
)]
async fn follow_user(
    CurrentUser(user): CurrentUser,
    Path(name): Path<String>,
    State(service): State<state::UserProfileService>,
    State(notification): State<state::NotificationService>,
) -> Result<Message, axum::response::Response> {
    let target_user = service
        .find_user_by_name(&name)
        .await
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| axum::http::StatusCode::NOT_FOUND.into_response())?;

    let res = service
        .follow(user.id, target_user.id)
        .await
        .map_err(IntoResponse::into_response)?;

    if res == FollowResult::AlreadyFollowing {
        return Ok(Message::ok());
    }

    notification
        .create_best_effort(
            target_user.id,
            crate::domain::model::NotificationKindEnum::NewFollower,
            crate::domain::model::NotificationTargetTypeEnum::User,
            user.id,
            crate::features::notification::NotificationPayload {
                summary: Some(format!("{} started following you", user.name)),
                target_url: Some(format!("/profile/{}", user.name)),
            },
        )
        .await;

    Ok(Message::ok())
}

#[utoipa::path(
    delete,
    tag = TAG,
    path = "/profile/{name}/follow",
    responses(
        (status = 200, body = Message),
    ),
)]
async fn unfollow_user(
    CurrentUser(user): CurrentUser,
    Path(name): Path<String>,
    State(service): State<state::UserProfileService>,
) -> Result<Message, axum::response::Response> {
    let target_user = service
        .find_user_by_name(&name)
        .await
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| axum::http::StatusCode::NOT_FOUND.into_response())?;

    service
        .unfollow(user.id, target_user.id)
        .await
        .map_err(IntoResponse::into_response)?;

    Ok(Message::ok())
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile/{name}",
    responses(
        (status = 200, body = DataUserProfile),
    ),
)]
async fn profile_with_name(
    session: AuthSession,
    State(service): State<state::UserProfileService>,
    Path(name): Path<String>,
) -> Result<Data<UserProfile>, impl IntoResponse> {
    load_profile(&service, &name, session.user.as_ref()).await
}

pub async fn load_profile(
    service: &state::UserProfileService,
    name: &str,
    current_user: Option<&domain::user::User>,
) -> Result<Data<UserProfile>, axum::response::Response> {
    let mut profile = service
        .find_by_name(name)
        .await
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| axum::http::StatusCode::NOT_FOUND.into_response())?;

    if let Some(current_user) = current_user {
        if current_user.name == profile.name {
            profile.settings = Some(current_user.settings.clone());
        } else {
            service
                .with_following(&mut profile, current_user)
                .await
                .map_err(IntoResponse::into_response)?;
        }
    }

    Ok(profile.into())
}
