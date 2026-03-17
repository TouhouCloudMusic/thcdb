use std::sync::LazyLock;

use ::image::ImageFormat;
use bytesize::ByteSize;
use entity::sea_orm_active_enums::ArtistImageType;
use entity::{artist_image, image as image_entity, user as user_entity};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};

use super::error::Error;
use super::model::ArtistProfileImageInput;
use crate::application::error::EntityNotFound;
use crate::constant::{
    ARTIST_PROFILE_IMAGE_MAX_FILE_SIZE, ARTIST_PROFILE_IMAGE_MAX_HEIGHT,
    ARTIST_PROFILE_IMAGE_MAX_WIDTH, ARTIST_PROFILE_IMAGE_MIN_HEIGHT,
    ARTIST_PROFILE_IMAGE_MIN_WIDTH,
};
use crate::domain::artist_image_queue::ArtistImageQueue;
use crate::domain::image;
use crate::domain::image::{
    CreateImageMeta, CurrentImageMetadata, ParseOption, Parser,
};
use crate::domain::image_queue::NewImageQueue;
use crate::domain::shared::ImageUploaderSummary;
use crate::features::artist::find::repo as artist_repo;
use crate::features::artist_image_queue::Repo as ArtistImageQueueRepo;
use crate::features::image_queue::Repo as ImageQueueRepo;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::storage::GenericFileStorage;

static ARTIST_PROFILE_IMAGE_PARSER: LazyLock<Parser> = LazyLock::new(|| {
    let opt = ParseOption::builder()
        .valid_formats(&[ImageFormat::Png, ImageFormat::Jpeg])
        .file_size_range(
            ByteSize::kib(10)..=ByteSize::b(ARTIST_PROFILE_IMAGE_MAX_FILE_SIZE),
        )
        .width_range(
            ARTIST_PROFILE_IMAGE_MIN_WIDTH..=ARTIST_PROFILE_IMAGE_MAX_WIDTH,
        )
        .height_range(
            ARTIST_PROFILE_IMAGE_MIN_HEIGHT..=ARTIST_PROFILE_IMAGE_MAX_HEIGHT,
        )
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

        if !artist_repo::exists(&self.repo.conn, artist_id).await? {
            Err(EntityNotFound::new(artist_id, "artist"))?;
        }

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

        let new_image_queue = NewImageQueue::new(&user, &image);

        let image_queue =
            ImageQueueRepo::create(&tx_repo, new_image_queue).await?;

        let artist_image_queue =
            ArtistImageQueue::profile(artist_id, image_queue.id);

        ArtistImageQueueRepo::create(&tx_repo, artist_image_queue).await?;

        drop(image_service);

        tx_repo.commit().await?;

        Ok(())
    }

    pub async fn get_profile_image_metadata(
        &self,
        artist_id: i32,
    ) -> Result<Option<CurrentImageMetadata>, Error> {
        let image = image_entity::Entity::find()
            .inner_join(artist_image::Entity)
            .filter(artist_image::Column::ArtistId.eq(artist_id))
            .filter(artist_image::Column::Type.eq(ArtistImageType::Profile))
            .order_by_desc(image_entity::Column::UploadedAt)
            .one(&self.repo.conn)
            .await?;

        let Some(image) = image else {
            return Ok(None);
        };

        let uploader = user_entity::Entity::find_by_id(image.uploaded_by)
            .into_partial_model::<ImageUploaderSummary>()
            .one(&self.repo.conn)
            .await?
            .unwrap_or_else(|| ImageUploaderSummary {
                id: image.uploaded_by,
                name: "Unknown".to_string(),
            });

        Ok(Some(CurrentImageMetadata {
            uploaded_at: image.uploaded_at,
            uploaded_by: uploader,
        }))
    }
}
