use macros::{ApiError, IntoErrorSchema};

use crate::domain::image::repository::TxRepo as ImageTxRepo;
use crate::domain::image::{
    AsyncFileStorage, CreateImageMeta, Parser, ValidationError, {self},
};
use crate::domain::repository::TransactionManager;
use crate::domain::user::{
    User, {self},
};

mod model;
pub use model::*;

mod parser {
    use std::sync::LazyLock;

    use ::image::ImageFormat;
    use bytesize::ByteSize;

    use crate::constant::{
        AVATAR_MAX_FILE_SIZE, AVATAR_MIN_FILE_SIZE,
        USER_PROFILE_BANNER_MAX_HEIGHT, USER_PROFILE_BANNER_MAX_WIDTH,
        USER_PROFILE_BANNER_MIN_HEIGHT, USER_PROFILE_BANNER_MIN_WIDTH,
    };
    use crate::domain::image::{ParseOption, Parser};

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
            .file_size_range(ByteSize::kib(10)..=ByteSize::mib(100))
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

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]

pub enum Error {
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    ImageService { source: image::Error },
    #[snafu(transparent)]
    Validate { source: ValidationError },
}

impl<E> From<E> for Error
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Clone)]
pub struct Service<R, S> {
    repo: R,
    storage: S,
}

impl<R, S> Service<R, S> {
    pub const fn new(repo: R, storage: S) -> Self {
        Self { repo, storage }
    }
}

impl<Repo, TxRepo, Storage> Service<Repo, Storage>
where
    Repo: TransactionManager<TransactionRepository = TxRepo>,
    TxRepo: Clone + user::TxRepo + image::Repo + ImageTxRepo,
    Storage: Clone + AsyncFileStorage,
{
    pub async fn upload_avatar(
        &self,
        user: User,
        buffer: &[u8],
    ) -> Result<(), Error> {
        update_user_image(
            self.repo.begin().await?,
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
            self.repo.begin().await?,
            self.storage.clone(),
            user,
            buffer,
            &parser::PROFILE_BANNER,
            |user| &mut user.profile_banner_id,
        )
        .await
    }
}

async fn update_user_image<TxRepo, Storage, F>(
    tx: TxRepo,
    storage: Storage,
    mut user: User,
    buffer: &[u8],
    parser: &'static Parser,
    get_field_fn: F,
) -> Result<User, Error>
where
    F: FnOnce(&mut User) -> &mut Option<i32>,
    TxRepo: Clone + user::TxRepo + image::Repo + ImageTxRepo,
    Storage: Clone + AsyncFileStorage,
{
    let image_service = image::Service::new(tx.clone(), storage);

    // Create new image
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

    let user = tx.update(user).await?;
    tx.commit().await?;

    Ok(user)
}
