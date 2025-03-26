use std::path::PathBuf;

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE;
use derive_more::From;
use entity::image;
use error_set::error_set;
use macros::ApiError;
use sea_orm::ActiveValue::*;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter};
use xxhash_rust::xxh3::xxh3_128;

use crate::domain::service::image::{
    AsyncImageStorage, InvalidType, ValidatedPath, Validator, ValidatorTrait,
};
use crate::error::DbErrWrapper;
use crate::infrastructure::adapter::storage::image::{
    FILE_IMAGE_STORAGE, LocalFileImageStorageError,
};

super::def_service!();

error_set! {
    #[derive(From, ApiError)]
    CreateError = {
        #[from(DbErr)]
        DbErr(DbErrWrapper),
        #[from(InvalidType, std::io::Error)]
        Infra(LocalFileImageStorageError),
    };
}

impl Service {
    pub async fn create(
        &self,
        data: &[u8],
        uploader_id: i32,
    ) -> Result<image::Model, CreateError> {
        let validator = Validator::default();
        let extension = validator.validate_extension(data)?;

        let data_hash = xxh3_128(data);
        let base64_hash = URL_SAFE.encode(data_hash.to_be_bytes());
        let filename = format!("{base64_hash}.{}", extension.inner());

        let sub_dir1 = &base64_hash[0..2];
        let sub_dir2 = &base64_hash[2..4];
        let sub_dir = [sub_dir1, sub_dir2].iter().collect::<PathBuf>();
        let image_path: PathBuf =
            [sub_dir1, sub_dir2, &filename].iter().collect();

        let full_path =
            ValidatedPath::from_validated_ext(&image_path, &extension);

        let _ = FILE_IMAGE_STORAGE.create(&full_path, data).await?;

        let task = async || {
            // 哈希可能碰撞，但哈希碰撞不太可能
            if let Some(image) = self.find_by_name(&filename).await? {
                Ok(image)
            } else {
                let active_model = image::ActiveModel {
                    id: NotSet,
                    filename: Set(filename),
                    uploaded_by: Set(uploader_id),
                    // All chars of sub dir are valid ascii, so unwrap is safe
                    directory: Set(sub_dir.to_str().unwrap().to_string()),
                    created_at: NotSet,
                };

                Ok::<_, CreateError>(
                    image::Entity::insert(active_model)
                        .exec_with_returning(&self.db)
                        .await?,
                )
            }
        };

        match task().await {
            Ok(image) => Ok(image),
            Err(err) => {
                FILE_IMAGE_STORAGE.remove(full_path).await?;
                Err(err)
            }
        }
    }

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<image::Model>, DbErr> {
        image::Entity::find()
            .filter(image::Column::Filename.eq(name))
            .one(&self.db)
            .await
    }
}

#[cfg(test)]
mod test {}
