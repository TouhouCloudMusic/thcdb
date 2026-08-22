use axum::extract::{Path, State};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::features::user_profile::{Error, FollowResult, UserProfile};
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
) -> Result<Data<UserProfile>, Error> {
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
) -> Result<Message, Error> {
    let target_user = service
        .find_user_by_name(&name)
        .await?
        .ok_or(Error::NotFound)?;

    let res = service.follow(user.id, target_user.id).await?;

    if res == FollowResult::AlreadyFollowing {
        return Ok(Message::ok());
    }

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
) -> Result<Message, Error> {
    let target_user = service
        .find_user_by_name(&name)
        .await?
        .ok_or(Error::NotFound)?;

    service.unfollow(user.id, target_user.id).await?;

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
) -> Result<Data<UserProfile>, Error> {
    load_profile(&service, &name, session.user.as_ref()).await
}

pub async fn load_profile(
    service: &state::UserProfileService,
    name: &str,
    current_user: Option<&crate::features::user::User>,
) -> Result<Data<UserProfile>, Error> {
    let mut profile =
        service.find_by_name(name).await?.ok_or(Error::NotFound)?;

    if let Some(current_user) = current_user {
        if current_user.name == profile.name {
            profile.settings = Some(current_user.settings.clone());
        } else {
            service.with_following(&mut profile, current_user).await?;
        }
    }

    Ok(profile.into())
}
