use axum::extract::{DefaultBodyLimit, State};
use axum::response::IntoResponse;
use axum_typed_multipart::TypedMultipart;
use constants::REQUEST_BODY_MAX_SIZE;
use domain::markdown::Markdown;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::features::user_image::{self, UploadAvatar, UploadProfileBanner};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::http::api_response::{self, AppError, Message};

const TAG: &str = "User";

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
enum Error {
    #[display("{_0}")]
    #[from]
    Image(#[error(source)] user_image::Error),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("Invalid bio format")]
    InvalidBioFormat,
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Image(source) => source.into_response(),
            Error::Database(source) => source.into_response(),
            Error::InvalidBioFormat => {
                AppError::bad_request("Invalid bio format").into_response()
            }
        }
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    let image_upload_routes = OpenApiRouter::new()
        .routes(routes!(upload_profile_banner))
        .routes(routes!(upload_avatar))
        .route_layer(DefaultBodyLimit::max(REQUEST_BODY_MAX_SIZE));

    AppRouter::new()
        .with_private(|r| {
            r.merge(image_upload_routes).routes(routes!(update_bio))
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
) -> Result<Message, Error> {
    service.upload_avatar(user, &form.data.contents).await?;
    Ok(Message::new("Upload successful"))
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
) -> Result<Message, Error> {
    let _ = service
        .upload_banner_image(user, &form.data.contents)
        .await?;
    Ok(Message::new("Upload successful"))
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
) -> Result<Message, Error> {
    use entity::user;
    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Set};

    let markdown =
        Markdown::parse(text).map_err(|()| Error::InvalidBioFormat)?;

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
        .map_err(Into::into)
}
