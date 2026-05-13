use axum::extract::State;
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::domain::markdown::Markdown;
use crate::features::user_image::{UploadAvatar, UploadProfileBanner};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::{self, AppError, Message};

const TAG: &str = "User";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(upload_profile_banner))
                .routes(routes!(upload_avatar))
                .routes(routes!(update_bio))
        })
        .finish()
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
    )
)]
async fn upload_avatar(
    CurrentUser(user): CurrentUser,
    State(service): State<state::UserImageService>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, AppError> {
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
    )
)]
async fn upload_profile_banner(
    CurrentUser(user): CurrentUser,
    State(service): State<state::UserImageService>,
    TypedMultipart(form): TypedMultipart<UploadProfileBanner>,
) -> Result<impl IntoResponse, AppError> {
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
    )
)]
async fn update_bio(
    CurrentUser(user): CurrentUser,
    State(database): State<state::SeaOrmRepository>,
    text: String,
) -> Result<Message, AppError> {
    use entity::user;
    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Set};

    let markdown = Markdown::parse(text).map_err(AppError::from)?;

    user::Entity::update_many()
        .filter(user::Column::Id.eq(user.id))
        .set(user::ActiveModel {
            bio: Set(Some(markdown.to_string())),
            ..Default::default()
        })
        .exec(&database.conn)
        .await
        .db_operation("update user bio")
        .map(|_| Message::new("Bio updated successfully"))
        .map_err(AppError::from)
}
