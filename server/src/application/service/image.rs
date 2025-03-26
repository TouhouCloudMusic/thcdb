use std::path::PathBuf;

use base64::Engine;
use base64::prelude::BASE64_URL_SAFE;
use xxhash_rust::xxh3::xxh3_128;

use crate::domain::entity::image::NewImage;
use crate::domain::service::image::{
    AsyncImageStorage, InvalidType, ValidatedPath, Validator, ValidatorTrait,
};
use crate::domain::{self};

#[derive(Debug, thiserror::Error)]
pub enum CreateError<R, C, RM> {
    #[error(transparent)]
    InvalidType(#[from] InvalidType),
    #[error(transparent)]
    Repo(R),
    #[error(transparent)]
    Create(C),
    #[error(transparent)]
    Remove(RM),
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

pub trait ServiceTrait<R, S>: Send + Sync
where
    R: domain::repository::image::Repository,
    S: AsyncImageStorage,
{
    async fn create(
        &self,
        data: &[u8],
        uploader_id: i32,
    ) -> Result<
        entity::image::Model,
        CreateError<R::Error, S::CreateError, S::RemoveError>,
    >;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, R::Error>;
}

impl<R, S> ServiceTrait<R, S> for Service<R, S>
where
    R: domain::repository::image::Repository,
    S: AsyncImageStorage,
{
    async fn create(
        &self,
        data: &[u8],
        uploader_id: i32,
    ) -> Result<
        entity::image::Model,
        CreateError<R::Error, S::CreateError, S::RemoveError>,
    > {
        let validator = Validator::default();
        let extension = validator.validate_extension(data)?;

        let data_hash = xxh3_128(data);
        let base64_hash = BASE64_URL_SAFE.encode(data_hash.to_be_bytes());
        let filename = format!("{base64_hash}.{}", extension.inner());

        let sub_dir1 = &base64_hash[0..2];
        let sub_dir2 = &base64_hash[2..4];
        let sub_dir = [sub_dir1, sub_dir2].iter().collect::<PathBuf>();
        let image_path: PathBuf =
            [sub_dir1, sub_dir2, &filename].iter().collect();

        let full_path =
            ValidatedPath::from_validated_ext(&image_path, &extension);

        self.storage
            .create(&full_path, data)
            .await
            .map_err(CreateError::Create)?;

        #[allow(clippy::type_complexity)]
        let res: Result<
            entity::image::Model,
            CreateError<R::Error, S::CreateError, S::RemoveError>,
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
                    .map_err(CreateError::Remove)?;
                Err(err)
            }
        }
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, R::Error> {
        self.repo.find_by_filename(filename).await
    }
}
