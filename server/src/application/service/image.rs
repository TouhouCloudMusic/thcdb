use std::path::PathBuf;

use base64::Engine;
use base64::prelude::BASE64_URL_SAFE;
use macros::ApiError;
use xxhash_rust::xxh3::xxh3_128;

use crate::domain::model::image::NewImage;
use crate::domain::service::image::{
    AsyncImageStorage, InvalidImageType, InvalidImageTypeOld,
};
use crate::domain::{self};
use crate::error::ImpledApiError;

#[derive(Debug, thiserror::Error)]
pub enum CreateErrorOld<R, S> {
    #[error(transparent)]
    InvalidType(#[from] InvalidImageTypeOld),
    #[error(transparent)]
    Repo(R),
    #[error(transparent)]
    Storage(S),
}

#[derive(Debug, thiserror::Error, ApiError)]
pub enum CreateError<R, S>
where
    R: ImpledApiError,
    S: ImpledApiError,
{
    #[error(transparent)]
    InvalidType(#[from] InvalidImageType),
    #[error(transparent)]
    Repo(R),
    #[error(transparent)]
    Storage(S),
}

#[derive(Clone, bon::Builder)]
pub struct Service<R, S>
where
    R: domain::repository::image::Repository,
    S: AsyncImageStorage,
{
    repo: R,
    storage: S,
}

pub trait ServiceTrait: Send + Sync {
    type CreateError;
    async fn create(
        &self,
        data: &[u8],
        extension: String,
        uploader_id: i32,
    ) -> Result<entity::image::Model, Self::CreateError>;

    type Error;
    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error>;
}

impl<R, S> ServiceTrait for Service<R, S>
where
    R: domain::repository::image::Repository,
    S: AsyncImageStorage,
    R::Error: ImpledApiError,
    S::Error: ImpledApiError,
{
    type CreateError = CreateError<R::Error, S::Error>;
    async fn create(
        &self,
        data: &[u8],
        extension: String,
        uploader_id: i32,
    ) -> Result<entity::image::Model, CreateError<R::Error, S::Error>> {
        let data_hash = xxh3_128(data);
        let base64_hash = BASE64_URL_SAFE.encode(data_hash.to_be_bytes());
        let filename = format!("{base64_hash}.{extension}");

        let sub_dir1 = &base64_hash[0..2];
        let sub_dir2 = &base64_hash[2..4];
        let sub_dir = [sub_dir1, sub_dir2].iter().collect::<PathBuf>();
        let image_path: PathBuf =
            [sub_dir1, sub_dir2, &filename].iter().collect();

        let full_path = image_path.with_extension(extension);

        self.storage
            .create(&full_path, data)
            .await
            .map_err(CreateError::Storage)?;

        #[allow(clippy::type_complexity)]
        let res: Result<
            entity::image::Model,
            CreateError<R::Error, S::Error>,
        > = try {
            if let Some(image) = self
                .find_by_filename(&filename)
                .await
                .map_err(CreateError::Repo)?
            {
                image
            } else {
                let new_img = NewImage::builder()
                    .filename(filename)
                    // All chars of sub dir are valid ascii, so unwrap is safe
                    .directory(sub_dir.to_str().unwrap().to_string())
                    .uploaded_by(uploader_id)
                    .build();

                self.repo.create(new_img).await.map_err(CreateError::Repo)?
            }
        };

        match res {
            Ok(image) => Ok(image),
            Err(err) => {
                self.storage
                    .remove(full_path)
                    .await
                    .map_err(CreateError::Storage)?;
                Err(err)
            }
        }
    }

    type Error = R::Error;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, R::Error> {
        self.repo.find_by_filename(filename).await
    }
}
