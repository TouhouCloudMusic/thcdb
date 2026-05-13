use std::sync::LazyLock;

use ::image::ImageFormat;
use axum::response::IntoResponse;
use bytesize::ByteSize;
use entity::enums::ReleaseImageType;
use entity::{image as image_entity, release_image, user as user_entity};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};

use super::model::ReleaseCoverArtInput;
use crate::constant::{
    RELEASE_COVER_IMAGE_MAX_HEIGHT, RELEASE_COVER_IMAGE_MAX_WIDTH,
    RELEASE_COVER_IMAGE_MIN_HEIGHT, RELEASE_COVER_IMAGE_MIN_WIDTH,
};
use crate::domain::image;
use crate::domain::image::{
    CreateImageMeta, CurrentImageMetadata, ParseOption, Parser,
};
use crate::domain::image_queue::NewImageQueue;
use crate::domain::release_image_queue::ReleaseImageQueue;
use crate::domain::shared::ImageUploaderSummary;
use crate::features::image_queue::Repo as ImageQueueRepo;
use crate::features::release::find::repo as release_repo;
use crate::features::release_image_queue::Repo as ReleaseImageQueueRepo;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::storage::GenericFileStorage;
use crate::shared::error::{EntityNotFound, InternalError};
use crate::shared::http::api_response::AppError;

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
        .build()
        .into_parser()
});

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
    Image(#[error(source)] image::Error),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
    #[display("{_0}")]
    #[from]
    NotFound(#[error(source)] EntityNotFound),
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Image(source) => match source {
                image::Error::InvalidInput(source) => {
                    AppError::bad_request(source.to_string()).into_response()
                }
                image::Error::Database(source) => source.into_response(),
                image::Error::Internal(source) => source.into_response(),
            },
            Error::Database(source) => source.into_response(),
            Error::Internal(source) => source.into_response(),
            Error::NotFound(source) => source.into_response(),
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

    pub async fn upload_cover_art(
        &self,
        dto: ReleaseCoverArtInput,
    ) -> Result<i32, Error> {
        let ReleaseCoverArtInput {
            bytes,
            user,
            release_id,
        } = dto;

        if !release_repo::exists(&self.repo.conn, release_id).await? {
            return Err(EntityNotFound::new("release", release_id).into());
        }

        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin release cover art upload transaction")?;

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

        let new_image_queue = NewImageQueue::new(&user, &created_image);
        let image_queue_entry =
            ImageQueueRepo::create(&tx_repo, new_image_queue).await?;

        let release_image_queue_entry =
            ReleaseImageQueue::cover(release_id, image_queue_entry.id);
        ReleaseImageQueueRepo::create(&tx_repo, release_image_queue_entry)
            .await?;

        drop(image_service);

        tx_repo.commit().await?;

        Ok(image_queue_entry.id)
    }

    pub async fn get_cover_art_metadata(
        &self,
        release_id: i32,
    ) -> Result<Option<CurrentImageMetadata>, Error> {
        let image = image_entity::Entity::find()
            .inner_join(release_image::Entity)
            .filter(release_image::Column::ReleaseId.eq(release_id))
            .filter(release_image::Column::Type.eq(ReleaseImageType::Cover))
            .order_by_desc(image_entity::Column::UploadedAt)
            .one(&self.repo.conn)
            .await
            .db_operation("find current release cover art")?;

        let Some(image) = image else {
            return Ok(None);
        };

        let uploader = user_entity::Entity::find_by_id(image.uploaded_by)
            .into_partial_model::<ImageUploaderSummary>()
            .one(&self.repo.conn)
            .await
            .db_operation("find release cover art uploader")?
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
