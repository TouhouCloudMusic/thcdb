use std::sync::LazyLock;

use ::image::ImageFormat;
use bytesize::ByteSize;

use super::error::Error;
use super::model::ReleaseCoverArtInput;
use crate::application::error::EntityNotFound;
use crate::constant::{
    RELEASE_COVER_IMAGE_MAX_HEIGHT, RELEASE_COVER_IMAGE_MAX_RATIO,
    RELEASE_COVER_IMAGE_MAX_WIDTH, RELEASE_COVER_IMAGE_MIN_HEIGHT,
    RELEASE_COVER_IMAGE_MIN_RATIO, RELEASE_COVER_IMAGE_MIN_WIDTH,
};
use crate::domain::image::{CreateImageMeta, ParseOption, Parser};
use crate::domain::release_image_queue::{self, ReleaseImageQueue};
use crate::domain::{image, image_queue};
use crate::features::release::find::repo as release_repo;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::storage::GenericFileStorage;

static RELEASE_COVER_IMAGE_PARSER: LazyLock<Parser> = LazyLock::new(|| {
    ParseOption::builder()
        .valid_formats(&[ImageFormat::Png, ImageFormat::Jpeg])
        .file_size_range(ByteSize::kib(10)..=ByteSize::mib(10))
        .width_range(
            RELEASE_COVER_IMAGE_MIN_WIDTH..=RELEASE_COVER_IMAGE_MAX_WIDTH,
        )
        .height_range(
            RELEASE_COVER_IMAGE_MIN_HEIGHT..=RELEASE_COVER_IMAGE_MAX_HEIGHT,
        )
        .ratio(RELEASE_COVER_IMAGE_MIN_RATIO..=RELEASE_COVER_IMAGE_MAX_RATIO)
        .build()
        .into_parser()
});

pub struct Service {
    repo: SeaOrmRepository,
    storage: GenericFileStorage,
}

impl Service {
    pub const fn new(
        repo: SeaOrmRepository,
        storage: GenericFileStorage,
    ) -> Self {
        Self { repo, storage }
    }

    pub async fn upload_cover_art(
        &self,
        dto: ReleaseCoverArtInput,
    ) -> Result<(), Error> {
        let ReleaseCoverArtInput {
            bytes,
            user,
            release_id,
        } = dto;

        if !release_repo::exists(&self.repo.conn, release_id).await? {
            Err(EntityNotFound::new(release_id, "release"))?;
        }

        let tx_repo = self.repo.begin_tx().await?;

        let image_service =
            image::Service::new(tx_repo.clone(), self.storage.clone());

        let created_image = image_service
            .create(
                &bytes,
                &RELEASE_COVER_IMAGE_PARSER,
                CreateImageMeta {
                    uploaded_by: user.id,
                },
            )
            .await?;

        let new_image_queue =
            image_queue::NewImageQueue::new(&user, &created_image);
        let image_queue_entry =
            image_queue::Repo::create(&tx_repo, new_image_queue).await?;

        let release_image_queue_entry =
            ReleaseImageQueue::cover(release_id, image_queue_entry.id);
        release_image_queue::Repo::create(&tx_repo, release_image_queue_entry)
            .await?;

        drop(image_service);

        tx_repo.commit().await?;

        Ok(())
    }
}
