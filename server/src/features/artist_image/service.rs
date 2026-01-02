use std::sync::LazyLock;

use ::image::ImageFormat;
use bytesize::ByteSize;

use super::error::Error;
use super::model::ArtistProfileImageInput;
use crate::constant::{
    ARTIST_PROFILE_IMAGE_MAX_HEIGHT, ARTIST_PROFILE_IMAGE_MAX_RATIO,
    ARTIST_PROFILE_IMAGE_MAX_WIDTH, ARTIST_PROFILE_IMAGE_MIN_HEIGHT,
    ARTIST_PROFILE_IMAGE_MIN_RATIO, ARTIST_PROFILE_IMAGE_MIN_WIDTH,
};
use crate::domain::artist_image_queue::{
    ArtistImageQueue, {self},
};
use crate::domain::image::{CreateImageMeta, ParseOption, Parser};
use crate::domain::{image, image_queue};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::storage::GenericFileStorage;

static ARTIST_PROFILE_IMAGE_PARSER: LazyLock<Parser> = LazyLock::new(|| {
    let opt = ParseOption::builder()
        .valid_formats(&[ImageFormat::Png, ImageFormat::Jpeg])
        .file_size_range(ByteSize::kib(10)..=ByteSize::mib(100))
        .width_range(
            ARTIST_PROFILE_IMAGE_MIN_WIDTH..=ARTIST_PROFILE_IMAGE_MAX_WIDTH,
        )
        .height_range(
            ARTIST_PROFILE_IMAGE_MIN_HEIGHT..=ARTIST_PROFILE_IMAGE_MAX_HEIGHT,
        )
        .ratio(ARTIST_PROFILE_IMAGE_MIN_RATIO..=ARTIST_PROFILE_IMAGE_MAX_RATIO)
        .build();
    Parser::new(opt)
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

    pub async fn upload_profile_image(
        &self,
        dto: ArtistProfileImageInput,
    ) -> Result<(), Error> {
        let ArtistProfileImageInput {
            bytes,
            user,
            artist_id,
        } = dto;

        let tx_repo = self.repo.begin_tx().await?;

        let image_service =
            image::Service::new(tx_repo.clone(), self.storage.clone());
        let image = image_service
            .create(
                &bytes,
                &ARTIST_PROFILE_IMAGE_PARSER,
                CreateImageMeta {
                    uploaded_by: user.id,
                },
            )
            .await?;

        let new_image_queue = image_queue::NewImageQueue::new(&user, &image);

        let image_queue =
            image_queue::Repo::create(&tx_repo, new_image_queue).await?;

        let artist_image_queue =
            ArtistImageQueue::profile(artist_id, image_queue.id);

        artist_image_queue::Repository::create(&tx_repo, artist_image_queue)
            .await?;

        drop(image_service);

        tx_repo.commit().await?;

        Ok(())
    }
}
