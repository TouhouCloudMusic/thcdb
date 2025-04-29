use std::sync::LazyLock;

use ::image::ImageFormat;
use bytesize::ByteSize;
use derive_more::From;
use error_set::error_set;
use futures_util::TryFutureExt;
use macros::{ApiError, IntoErrorSchema};

use crate::constant::{
    USER_PROFILE_BANNER_MAX_HEIGHT, USER_PROFILE_BANNER_MAX_WIDTH,
    USER_PROFILE_BANNER_MIN_HEIGHT, USER_PROFILE_BANNER_MIN_WIDTH,
};
use crate::domain::image::{self, ParseOption, Parser, ValidationError};
use crate::domain::user::{self, User};
use crate::domain::{self};
use crate::error::InternalError;

static PROFILE_BANNER_PARSER: LazyLock<Parser> = LazyLock::new(|| {
    let opt = ParseOption::builder()
        .valid_formats(&[ImageFormat::Png, ImageFormat::Jpeg])
        .file_size_range(ByteSize::kib(10)..=ByteSize::mib(100))
        .width_range(
            USER_PROFILE_BANNER_MIN_WIDTH..=USER_PROFILE_BANNER_MAX_WIDTH,
        )
        .height_range(
            USER_PROFILE_BANNER_MIN_HEIGHT..=USER_PROFILE_BANNER_MAX_HEIGHT,
        )
        .ratio(1f64..=1f64)
        .build();
    Parser::new(opt)
});

error_set! {
    #[derive(ApiError, IntoErrorSchema, From)]
    #[disable(From(InternalError))]
    UserImageServiceError = {
        #[from(forward)]
        Internal(InternalError),
        ImageService(image::Error),
        Validate(ValidationError),

    };
}

pub struct UserImageService<UR, S> {
    user_repo: UR,
    image_service: S,
}

impl<U, IS> UserImageService<U, IS> {
    pub const fn new(user_repo: U, s: IS) -> Self {
        Self {
            user_repo,
            image_service: s,
        }
    }
}

impl<UR, IS> UserImageService<UR, IS>
where
    UR: user::TransactionRepository,
    IS: domain::image::ServiceTrait,
    UserImageServiceError: From<UR::Error>,
{
    // FIXME: Transaction is controlled externally
    pub async fn upload_banner_image(
        self,
        mut user: User,
        buffer: &[u8],
    ) -> Result<User, UserImageServiceError> {
        let parser = &PROFILE_BANNER_PARSER;

        let image = self
            .image_service
            .create(buffer, parser, user.id)
            .map_err(UserImageServiceError::ImageService)
            .await?;

        user.profile_banner_id = Some(image.id);

        let user = self.user_repo.save(user).await?;

        self.user_repo.commit().await?;

        Ok(user)
    }
}
