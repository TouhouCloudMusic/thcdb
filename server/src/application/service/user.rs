use bytesize::ByteSize;
use error_set::error_set;
use futures_util::TryFutureExt;
use image::ImageFormat;
use macros::{ApiError, IntoErrorSchema};

use super::ImageServiceTrait;
use crate::constant::{
    PROFILE_BANNER_MAX_HEIGHT, PROFILE_BANNER_MAX_WIDTH,
    PROFILE_BANNER_MIN_HEIGHT, PROFILE_BANNER_MIN_WIDTH,
};
use crate::domain::UserRepository;
use crate::domain::model::user::User;
use crate::domain::service::image::{
    ImageValidator, ImageValidatorOption, ValidationError,
};
use crate::error::ImpledApiError;

const PROFILE_BANNER_VALIDATE_OPTION: ImageValidatorOption =
    ImageValidatorOption {
        valid_formats: &[ImageFormat::Png, ImageFormat::Jpeg],
        file_size_limit: Some(ByteSize::kib(10))..Some(ByteSize::mib(100)),
        width_limit: Some(PROFILE_BANNER_MIN_WIDTH)
            ..Some(PROFILE_BANNER_MAX_WIDTH),
        height_limit: Some(PROFILE_BANNER_MIN_HEIGHT)
            ..Some(PROFILE_BANNER_MAX_HEIGHT),
    };

const PROFILE_BANNER_VALIDATOR: ImageValidator =
    ImageValidator::new(PROFILE_BANNER_VALIDATE_OPTION);

error_set! {
    #[derive(ApiError, IntoErrorSchema)]
    #[disable(From(U, IS))]
    UserImageServiceError<U: ImpledApiError, IS: ImpledApiError> = {
        UserRepo(U),
        ImageService(IS),
        Validate(ValidationError),
    };
}

pub struct UserImageService<U, IS> {
    user_repo: U,
    image_service: IS,
}

impl<U, IS> UserImageService<U, IS> {
    pub const fn new(user_repo: U, image_service: IS) -> Self {
        Self {
            user_repo,
            image_service,
        }
    }
}

impl<U, IS> UserImageService<U, IS>
where
    U: UserRepository,
    U::Error: ImpledApiError,
    IS: ImageServiceTrait,
    IS::CreateError: ImpledApiError,
{
    pub async fn upload_banner_image(
        &self,
        mut user: User,
        buffer: &[u8],
    ) -> Result<User, UserImageServiceError<U::Error, IS::CreateError>> {
        let validator = PROFILE_BANNER_VALIDATOR;

        let res = validator.validate(buffer)?;

        let image = self
            .image_service
            .create(buffer, res.extension, user.id)
            .map_err(UserImageServiceError::ImageService)
            .await?;

        user.profile_banner_id = Some(image.id);

        let user = self
            .user_repo
            .save(user)
            .await
            .map_err(UserImageServiceError::UserRepo)?;

        Ok(user)
    }
}
