use derive_more::From;
use entity::enums::ImageRefEntityType;
use error_set::error_set;
use futures_util::TryFutureExt;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::image::repository::TxRepo as ImageTxRepo;
use crate::domain::image::{
    self, AsyncImageStorage, CreateImageMeta, ValidationError,
};
use crate::domain::repository::{Transaction, TransactionManager};
use crate::domain::user::{self, TxRepo, User};
use crate::error::InfraError;

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

error_set! {
    #[derive(ApiError, IntoErrorSchema, From)]
    #[disable(From(InfraError))]
    UserImageServiceError = {
        #[from(forward)]
        Internal(InfraError),
        ImageService(image::Error),
        Validate(ValidationError),
    };
}

#[derive(Clone)]
pub struct UserImageService<R, S> {
    repo: R,
    storage: S,
}

impl<R, S> UserImageService<R, S> {
    pub const fn new(repo: R, storage: S) -> Self {
        Self { repo, storage }
    }
}

impl<R, S> UserImageService<R, S>
where
    R: TransactionManager,
    R::TransactionRepository: Clone + user::TxRepo + image::Repo + ImageTxRepo,
    S: Clone + AsyncImageStorage,
{
    pub async fn upload_avatar(
        &self,
        mut user: User,
        buffer: &[u8],
    ) -> Result<(), UserImageServiceError> {
        const USAGE: &str = "avatar";
        let tx = self.repo.begin().await?;

        // drop image service because tx is arc
        {
            let image_service =
                image::Service::new(tx.clone(), self.storage.clone());

            // Handle previous avatar reference
            if let Some(old_avatar_id) = user.avatar_id {
                // Delete the reference between user and avatar

                let image_ref = entity::image_reference::Model {
                    image_id: old_avatar_id,
                    ref_entity_id: user.id,
                    ref_entity_type: ImageRefEntityType::User,
                    ref_usage: Some(USAGE.to_string()),
                };
                image_service
                    .decr_ref_count(image_ref)
                    .await
                    .map_err(UserImageServiceError::ImageService)?;
            }

            let new_avatar = image_service
                .create(
                    buffer,
                    &parser::AVATAR,
                    CreateImageMeta {
                        entity_id: user.id,
                        entity_type: ImageRefEntityType::User,
                        usage: Some(USAGE.into()),
                        uploaded_by: user.id,
                    },
                )
                .await
                .map_err(UserImageServiceError::ImageService)?;

            user.avatar_id = Some(new_avatar.id);
        }

        tx.update(user).await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn upload_banner_image(
        &self,
        mut user: User,
        buffer: &[u8],
    ) -> Result<User, UserImageServiceError> {
        const USAGE: &str = "profile_banner";
        let tx = self.repo.begin().await?;

        let image_service =
            image::Service::new(tx.clone(), self.storage.clone());

        // Handle previous banner reference
        if let Some(image_id) = user.profile_banner_id {
            // Delete the reference between user and banner

            let image_ref = entity::image_reference::Model {
                image_id,
                ref_entity_id: user.id,
                ref_entity_type: ImageRefEntityType::User,
                ref_usage: Some(USAGE.to_string()),
            };
            image_service
                .decr_ref_count(image_ref)
                .await
                .map_err(UserImageServiceError::ImageService)?;
        }

        let image = image_service
            .create(
                buffer,
                &parser::PROFILE_BANNER,
                CreateImageMeta {
                    entity_id: user.id,
                    entity_type: ImageRefEntityType::User,
                    usage: Some(USAGE.into()),
                    uploaded_by: user.id,
                },
            )
            .map_err(UserImageServiceError::ImageService)
            .await?;

        user.profile_banner_id = Some(image.id);

        let user = tx.update(user).await?;

        tx.commit().await?;

        Ok(user)
    }
}
