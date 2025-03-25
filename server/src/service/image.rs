use std::io;
use std::path::PathBuf;

use axum::body::Bytes;
use axum::http::StatusCode;
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE;
use derive_more::{Display, Error, From};
use entity::image;
use error_set::error_set;
use macros::ApiError;
use sea_orm::ActiveValue::*;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter};
use smart_default::SmartDefault;
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use xxhash_rust::xxh3::xxh3_128;

use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::error::{DbErrWrapper, ErrorCode};

super::def_service!();

error_set! {
    #[derive(From, ApiError)]
    CreateError = {
        #[from(DbErr)]
        DbErr(DbErrWrapper),
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            error_code = ErrorCode::IoError,
            into_response = self
        )]
        #[display("{}", ErrorCode::IoError.message())]
        Fs(std::io::Error),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::InvalidImageType,
            into_response = self
        )]
        InvalidType(InvalidType)
    };
}

#[derive(Debug, Display, Error, SmartDefault)]
#[display("Invalid image type, accepted: {accepted}, expected: {expected}")]
pub struct InvalidType {
    #[default = "Unknown"]
    accepted: String,
    #[default = "png or jpeg"]
    expected: &'static str,
}

impl InvalidType {
    fn from_accepted(accepted: impl Into<String>) -> Self {
        Self {
            accepted: accepted.into(),
            ..Default::default()
        }
    }

    fn unknown() -> Self {
        Self {
            accepted: "Unknown".to_string(),
            ..Default::default()
        }
    }
}

impl Service {
    pub async fn create(
        &self,
        data: Bytes,
        uploader_id: i32,
    ) -> Result<image::Model, CreateError> {
        let extension = match ::image::guess_format(&data) {
            Ok(format) => match &format {
                ::image::ImageFormat::Png | ::image::ImageFormat::Jpeg => {
                    *format.extensions_str().first().unwrap()
                }
                _ => Err(InvalidType::from_accepted(
                    *format.extensions_str().first().unwrap(),
                ))?,
            },
            Err(err) => {
                tracing::error!(
                    "Error while guessing format on create image: {}",
                    err
                );

                Err(InvalidType::unknown())?
            }
        };

        let data_hash = xxh3_128(&data);
        let file_hash = URL_SAFE.encode(data_hash.to_be_bytes());
        let filename = format!("{file_hash}.{extension}");

        let sub_dir1 = &file_hash[0..2];
        let sub_dir2 = &file_hash[2..4];
        let sub_dir = [sub_dir1, sub_dir2];
        let sub_dir_pathbuf: PathBuf = sub_dir.iter().collect();

        check_and_create_img_sub_dir(&sub_dir).await?;

        // eg. image/ab/cd/filename.jpg
        let full_path = gen_image_path(&sub_dir, &file_hash, extension);

        let mut file = File::create(&full_path).await?;

        let task = async || {
            file.write_all(&data).await?;
            file.flush().await?;

            // 哈希可能碰撞，但哈希碰撞不太可能
            if let Some(image) = self.find_by_name(&filename).await? {
                Ok(image)
            } else {
                let active_model = image::ActiveModel {
                    filename: Set(filename),
                    uploaded_by: Set(uploader_id),
                    directory: Set(sub_dir_pathbuf
                        .to_str()
                        // Should it be safe here?
                        .unwrap()
                        .to_string()),

                    id: NotSet,
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
                fs::remove_file(&full_path).await.map_err(|e| {
                    tracing::error!("Failed to remove file: {}", e);
                    CreateError::Fs(e)
                })?;
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

async fn check_and_create_img_sub_dir(sub_dir: &[&str]) -> io::Result<()> {
    let image_dir_path: PathBuf =
        [PUBLIC_DIR, IMAGE_DIR].iter().chain(sub_dir).collect();

    tokio::fs::create_dir_all(&image_dir_path).await
}

fn gen_image_path(sub_dir: &[&str], file_hash: &str, ext: &str) -> PathBuf {
    [PUBLIC_DIR, IMAGE_DIR]
        .iter()
        .chain(sub_dir)
        .chain([file_hash].iter())
        .collect::<PathBuf>()
        .with_extension(ext)
}

#[cfg(test)]
mod test {

    use std::path::PathBuf;

    use image::ImageFormat;

    use crate::service::image::gen_image_path;

    #[test]
    fn path_display() {
        let path: PathBuf = gen_image_path(
            &["aa", "bb"],
            "filename",
            ImageFormat::Jpeg.extensions_str().first().unwrap(),
        );

        assert_eq!(
            path.display().to_string(),
            "public/image/aa/bb/filename.jpg"
        );
    }
}
