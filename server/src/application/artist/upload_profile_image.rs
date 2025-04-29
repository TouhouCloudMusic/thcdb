use std::sync::LazyLock;

use ::image::ImageFormat;
use bytes::Bytes;
use bytesize::ByteSize;
use derive_more::{Display, From};
use macros::{ApiError, IntoErrorSchema};
use thiserror::Error;

use crate::constant::{
    ARTIST_PROFILE_IMAGE_MAX_HEIGHT, ARTIST_PROFILE_IMAGE_MAX_WIDTH,
    ARTIST_PROFILE_IMAGE_MIN_HEIGHT, ARTIST_PROFILE_IMAGE_MIN_WIDTH,
    ARTIST_PROFILE_IMAGE_RATIO_MAX, ARTIST_PROFILE_IMAGE_RATIO_MIN,
};
use crate::domain::artist_image_queue::{self, ArtistImageQueue};
use crate::domain::image::{
    AsyncImageStorage, ParseOption, Parser, ServiceTrait,
};
use crate::domain::repository::{
    RepositoryTrait, TransactionManager, TransactionRepositoryTrait,
};
use crate::domain::user::User;
use crate::domain::{image, image_queue};
use crate::error::InternalError;

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
        .ratio(ARTIST_PROFILE_IMAGE_RATIO_MIN..=ARTIST_PROFILE_IMAGE_RATIO_MAX)
        .build();
    Parser::new(opt)
});

#[derive(Debug, Display, Error, From, ApiError, IntoErrorSchema)]
pub enum Error {
    #[from(forward)]
    Internal(InternalError),
    Service(#[from] image::Error),
}

pub struct UploadArtistProfileImageUseCase<Repo, Storage> {
    repo: Repo,
    storage: Storage,
}

impl<Repo, Storage> UploadArtistProfileImageUseCase<Repo, Storage>
where
    Repo: TransactionManager,
    // Perhaps these repos should be separated, but there is no need for this in the foreseeable future.
    Repo::TransactionRepository: Clone
        + RepositoryTrait
        + image::Repository
        + image_queue::Repository
        + artist_image_queue::Repository,
    Storage: AsyncImageStorage + Clone,
    InternalError: From<Repo::Error>
        + From<<Repo::TransactionRepository as RepositoryTrait>::Error>
        + From<Storage::Error>,
{
    /// Warn: Make sure inner transaction is wrapped in Arc
    pub const fn new(repo: Repo, storage: Storage) -> Self {
        Self { repo, storage }
    }

    pub async fn exec(
        &self,
        dto: UploadArtistProfileImageDto,
    ) -> Result<(), Error> {
        let UploadArtistProfileImageDto {
            bytes,
            user,
            artist_id,
        } = dto;

        let tx_repo = self.repo.begin_transaction().await?;

        let image_service = image::Service::builder()
            .repo(tx_repo.clone())
            .storage(self.storage.clone())
            .build();

        let image = image_service
            .create(&bytes, &ARTIST_PROFILE_IMAGE_PARSER, user.id)
            .await?;

        let new_image_queue = image_queue::NewImageQueue::new(&user, &image);

        let image_queue =
            image_queue::Repository::create(&tx_repo, new_image_queue).await?;

        let artist_image_queue =
            ArtistImageQueue::profile(artist_id, image_queue.id);

        artist_image_queue::Repository::create(&tx_repo, artist_image_queue)
            .await?;

        tx_repo.commit().await?;

        Ok(())
    }
}

pub struct UploadArtistProfileImageDto {
    pub bytes: Bytes,
    #[doc(alias = "uploaded_by")]
    pub user: User,
    pub artist_id: i32,
}
