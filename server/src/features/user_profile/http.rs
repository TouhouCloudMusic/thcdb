use axum::extract::{Path, State};
use axum::response::IntoResponse;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::domain;
use crate::domain::user::UserProfile;

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
        .with_private(|r| r.routes(routes!(profile)))
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
        service
            .with_following(&mut profile, current_user)
            .await
            .map_err(IntoResponse::into_response)?;
    }

    Ok(profile.into())
}
