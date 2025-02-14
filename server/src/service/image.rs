use std::error::Error;
use std::path::PathBuf;

use axum::body::Bytes;
use axum::http::StatusCode;
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE;
use entity::image;
use itertools::Itertools;
use sea_orm::ActiveValue::*;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use xxhash_rust::xxh3::xxh3_128;

use crate::api_response::StatusCodeExt;
use crate::constant::IMAGE_DIR;
use crate::error::{ApiErrorTrait, AsErrorCode, DbErrWrapper, ErrorCode};

super::def_service!();
use error_set::error_set;

error_set! {
    CreateError = {
        DbErr(DbErrWrapper),
        WriteFile(std::io::Error),
        InvalidType(InvalidType)
    };
}

impl From<DbErr> for CreateError {
    fn from(value: DbErr) -> Self {
        Self::DbErr(DbErrWrapper::from(value))
    }
}

impl StatusCodeExt for CreateError {
    fn as_status_code(&self) -> axum::http::StatusCode {
        match self {
            Self::DbErr(db_err_wrapper) => db_err_wrapper.as_status_code(),
            Self::WriteFile(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::InvalidType(invalid_type) => invalid_type.as_status_code(),
        }
    }

    fn all_status_codes() -> impl Iterator<Item = axum::http::StatusCode> {
        DbErrWrapper::all_status_codes()
            .chain([StatusCode::INTERNAL_SERVER_ERROR])
            .chain(InvalidType::all_status_codes())
            .unique()
    }
}

impl AsErrorCode for CreateError {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::DbErr(_) => ErrorCode::DatabaseError,
            Self::WriteFile(_) => ErrorCode::IoError,
            Self::InvalidType(_) => ErrorCode::InvalidImageType,
        }
    }
}

impl ApiErrorTrait for CreateError {}

#[derive(Debug, derive_more::Display)]
#[display("Invalid image type, accepted: {accepted}, expected: {expected}")]
pub struct InvalidType {
    accepted: String,
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

impl Error for InvalidType {}

impl Default for InvalidType {
    fn default() -> Self {
        Self {
            accepted: String::new(),
            expected: "png or jpeg",
        }
    }
}

impl StatusCodeExt for InvalidType {
    fn as_status_code(&self) -> axum::http::StatusCode {
        axum::http::StatusCode::BAD_REQUEST
    }

    fn all_status_codes() -> impl Iterator<Item = axum::http::StatusCode> {
        [axum::http::StatusCode::BAD_REQUEST].into_iter()
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
        let filename = URL_SAFE.encode(data_hash.to_be_bytes());

        let dir1 = &filename[0..2];
        let dir2 = &filename[2..4];
        let pre_path: PathBuf = [dir1, dir2].iter().collect();

        // eg. image/ab/cd/filename.jpg
        let full_path = [IMAGE_DIR, dir1, dir2, &filename]
            .iter()
            .collect::<PathBuf>()
            .with_extension(extension);

        // Write file
        let mut file = File::create(full_path).await?;
        file.write_all(&data).await?;
        file.flush().await?;

        // 哈希可能碰撞，但哈希碰撞不太可能
        if let Some(image) = self.find_by_name(&filename).await? {
            Ok(image)
        } else {
            let active_model = image::ActiveModel {
                filename: Set(filename),
                uploaded_by: Set(uploader_id),
                directory: Set(pre_path
                    .to_str()
                    // Should it be safe here?
                    .unwrap()
                    .to_string()),

                id: NotSet,
                created_at: NotSet,
            };

            Ok(image::Entity::insert(active_model)
                .exec_with_returning(&self.db)
                .await?)
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
mod test {

    use std::path::PathBuf;

    use image::ImageFormat;

    #[test]
    fn path_display() {
        let path: PathBuf = ["image", "aa", "bb", "filename"].iter().collect();

        let path = path.with_extension(
            ImageFormat::Jpeg.extensions_str().first().unwrap(),
        );
        assert_eq!(path.display().to_string(), "image/aa/bb/filename.jpg");
    }
}
