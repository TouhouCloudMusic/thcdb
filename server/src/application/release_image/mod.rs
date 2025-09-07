use std::sync::LazyLock;

use ::image::ImageFormat;
use axum::http::StatusCode;
use bytes::Bytes;
use bytesize::ByteSize;
use macros::{ApiError, IntoErrorSchema};
use snafu::Snafu;

use super::error::EntityNotFound;
use crate::domain::image::{
    AsyncFileStorage, CreateImageMeta, ParseOption, Parser,
};
use crate::domain::release_image::{self};
use crate::domain::release_image_queue::{self, ReleaseImageQueue};
use crate::domain::repository::{Transaction, TransactionManager};
use crate::domain::user::User;
use crate::domain::{image, image_queue, release};
use crate::infra;

static RELEASE_COVER_IMAGE_PARSER: LazyLock<Parser> = LazyLock::new(|| {
    use crate::constant::{
        RELEASE_COVER_IMAGE_MAX_HEIGHT, RELEASE_COVER_IMAGE_MAX_RATIO,
        RELEASE_COVER_IMAGE_MAX_WIDTH, RELEASE_COVER_IMAGE_MIN_HEIGHT,
        RELEASE_COVER_IMAGE_MIN_RATIO, RELEASE_COVER_IMAGE_MIN_WIDTH,
    };
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

#[derive(Debug, Snafu, ApiError, IntoErrorSchema)]

pub enum Error {
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    Service { source: image::Error },
    #[api_error(
        status_code = StatusCode::BAD_REQUEST,
        into_response = self
    )]
    #[snafu(transparent)]
    ReleaseNotFound { source: EntityNotFound },
}

impl<T> From<T> for Error
where
    T: Into<infra::Error>,
{
    default fn from(value: T) -> Self {
        Self::Infra {
            source: value.into(),
        }
    }
}

pub struct Service<Repo, Storage> {
    repo: Repo,
    storage: Storage,
}

impl<Repo, TxRepo, Storage> Service<Repo, Storage>
where
    Repo: TransactionManager<TransactionRepository = TxRepo> + release::Repo,
    TxRepo: Clone
        + Transaction
        + image::TxRepo
        + image_queue::Repo
        + release_image::Repo
        + release_image_queue::Repo,
    Storage: AsyncFileStorage + Clone,
{
    pub const fn new(repo: Repo, storage: Storage) -> Self {
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

        if !self.repo.exist(release_id).await? {
            Err(EntityNotFound::new(release_id, "release"))?;
        }

        let tx_repo = self.repo.begin().await?;

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

pub struct ReleaseCoverArtInput {
    pub bytes: Bytes,
    pub user: User,
    pub release_id: i32,
}
