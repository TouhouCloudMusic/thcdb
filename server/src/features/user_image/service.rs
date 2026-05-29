use axum::response::IntoResponse;
use infra_db::{SeaOrmRepository, SeaOrmTxRepo};

use crate::features::image_upload;
use crate::features::image_upload::{CreateImageMeta, Parser};
use crate::features::user::User;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::storage::GenericFileStorage;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;

mod parser {
    use std::sync::LazyLock;

    use ::image::ImageFormat;
    use bytesize::ByteSize;
    use constants::{
        AVATAR_MAX_FILE_SIZE, AVATAR_MIN_FILE_SIZE,
        USER_PROFILE_BANNER_MAX_HEIGHT, USER_PROFILE_BANNER_MAX_WIDTH,
        USER_PROFILE_BANNER_MIN_HEIGHT, USER_PROFILE_BANNER_MIN_WIDTH,
    };

    use crate::features::image_upload::{ParseOption, Parser};

    pub static AVATAR: LazyLock<Parser> = LazyLock::new(|| {
        ParseOption::builder()
            .valid_formats(&[ImageFormat::Png, ImageFormat::Jpeg])
            .file_size_range(
                ByteSize::b(AVATAR_MIN_FILE_SIZE)
                    ..=ByteSize::b(AVATAR_MAX_FILE_SIZE),
            )
            .size_range(128u32..=2048)
            .ratio(ParseOption::SQUARE)
            .build()
            .into_parser()
    });

    pub static PROFILE_BANNER: LazyLock<Parser> = LazyLock::new(|| {
        let ratio = f64::from(USER_PROFILE_BANNER_MAX_WIDTH)
            / f64::from(USER_PROFILE_BANNER_MAX_HEIGHT);
        ParseOption::builder()
            .valid_formats(&[ImageFormat::Png, ImageFormat::Jpeg])
            .file_size_range(ByteSize::kib(10)..=ByteSize::mib(25))
            .width_range(
                USER_PROFILE_BANNER_MIN_WIDTH..=USER_PROFILE_BANNER_MAX_WIDTH,
            )
            .height_range(
                USER_PROFILE_BANNER_MIN_HEIGHT..=USER_PROFILE_BANNER_MAX_HEIGHT,
            )
            .ratio(ratio..=ratio)
            .build()
            .into_parser()
    });
}

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
    storage: GenericFileStorage,
}

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("{_0}")]
    #[from]
    Image(#[error(source)] image_upload::Error),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Image(source) => match source {
                image_upload::Error::InvalidInput(source) => {
                    AppError::bad_request(source.to_string()).into_response()
                }
                image_upload::Error::Database(source) => source.into_response(),
                image_upload::Error::Internal(source) => source.into_response(),
            },
            Error::Database(source) => source.into_response(),
            Error::Internal(source) => source.into_response(),
        }
    }
}

impl Service {
    pub const fn new(
        repo: SeaOrmRepository,
        storage: GenericFileStorage,
    ) -> Self {
        Self { repo, storage }
    }

    pub async fn upload_avatar(
        &self,
        user: User,
        buffer: &[u8],
    ) -> Result<(), Error> {
        update_user_image(
            self.repo
                .begin_tx()
                .await
                .db_operation("begin avatar upload transaction")?,
            self.storage.clone(),
            user,
            buffer,
            &parser::AVATAR,
            |user| &mut user.avatar_id,
        )
        .await
        .map(|_| ())
    }

    pub async fn upload_banner_image(
        &self,
        user: User,
        buffer: &[u8],
    ) -> Result<User, Error> {
        update_user_image(
            self.repo
                .begin_tx()
                .await
                .db_operation("begin profile banner upload transaction")?,
            self.storage.clone(),
            user,
            buffer,
            &parser::PROFILE_BANNER,
            |user| &mut user.profile_banner_id,
        )
        .await
    }
}

async fn update_user_image<F>(
    tx: SeaOrmTxRepo,
    storage: GenericFileStorage,
    mut user: User,
    buffer: &[u8],
    parser: &'static Parser,
    get_field_fn: F,
) -> Result<User, Error>
where
    F: FnOnce(&mut User) -> &mut Option<i32>,
{
    let image_service = image_upload::Service::new(tx.clone(), storage);

    let new_image = image_service
        .create(
            buffer,
            parser,
            CreateImageMeta {
                uploaded_by: user.id,
            },
        )
        .await?;

    let image_field_ref = get_field_fn(&mut user);
    let prev_id = *image_field_ref;
    let new_id = Some(new_image.id);

    if prev_id == new_id {
        return Ok(user);
    }

    *image_field_ref = new_id;

    drop(image_service);

    let user = crate::features::user::repo::update(&tx, user).await?;
    tx.commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;

    Ok(user)
}
