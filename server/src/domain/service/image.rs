use std::path::{Path, PathBuf};

use axum::http::StatusCode;
use derive_more::{Display, Error};
use macros::ApiError;
use smart_default::SmartDefault;

use crate::error::ErrorCode;

#[derive(Debug, Display, Error, SmartDefault, ApiError)]
#[display("Invalid image type, accepted: {accepted}, expected: {expected}")]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
    error_code = ErrorCode::InvalidImageType
)]
pub struct InvalidType {
    #[default = "Unknown"]
    accepted: String,
    #[default = "png or jpeg"]
    expected: &'static str,
}

impl InvalidType {
    pub fn from_accepted(accepted: impl Into<String>) -> Self {
        Self {
            accepted: accepted.into(),
            ..Default::default()
        }
    }
}

pub struct ValidatedExtension<'s>(&'s str);

impl ValidatedExtension<'_> {
    pub const fn inner(&self) -> &str {
        self.0
    }
}

pub struct ValidatedPath(PathBuf);

impl ValidatedPath {
    pub const fn inner(&self) -> &PathBuf {
        &self.0
    }

    pub fn new(
        validator: &impl ValidatorTrait,
        path: &Path,
        buffer: &[u8],
    ) -> Result<Self, InvalidType> {
        let ext = validator.validate_extension(buffer)?;

        let path = path.with_extension(ext.0);

        Ok(Self(path))
    }

    pub fn from_validated_ext(path: &Path, ext: &ValidatedExtension) -> Self {
        let path = path.with_extension(ext.0);

        Self(path)
    }
}

impl From<ValidatedPath> for PathBuf {
    fn from(val: ValidatedPath) -> Self {
        val.0
    }
}

impl AsRef<Path> for ValidatedPath {
    fn as_ref(&self) -> &Path {
        &self.0
    }
}

pub trait ValidatorTrait {
    fn validate_extension(
        &self,
        buffer: &[u8],
    ) -> Result<ValidatedExtension, InvalidType>;
}

#[derive(Default)]
pub struct Validator {}

impl ValidatorTrait for Validator {
    fn validate_extension(
        &self,
        buffer: &[u8],
    ) -> std::result::Result<ValidatedExtension, InvalidType> {
        let res = match ::image::guess_format(buffer) {
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

                Err(InvalidType::default())?
            }
        };

        Ok(ValidatedExtension(res))
    }
}

pub trait AsyncImageStorage: Send + Sync {
    type File;
    type Error;

    async fn create(
        &self,
        path: &ValidatedPath,
        data: &[u8],
    ) -> Result<Self::File, Self::Error>;

    async fn remove(
        &self,
        path: impl AsRef<Path> + Send + Sync,
    ) -> Result<(), Self::Error>;
}
