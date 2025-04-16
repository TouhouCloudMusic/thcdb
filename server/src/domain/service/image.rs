use std::io;
use std::ops::Range;
use std::path::Path;

use axum::http::StatusCode;
use bytesize::ByteSize;
use derive_more::{Display, Error};
use error_set::error_set;
use image::{GenericImageView, ImageError, ImageFormat, ImageReader};
use macros::ApiError;
use smart_default::SmartDefault;

use crate::error::ErrorCode;

error_set! {
    #[derive(ApiError)]
    ValidationError = {
        InvalidType(InvalidImageType),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::BadRequest,
            into_response = self
        )]
        InvalidFileSize(InvalidImageFileSize),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::BadRequest,
            into_response = self
        )]
        InvalidSize(InvalidImageSize),

        // TODO: Internal error wrapper
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            error_code = ErrorCode::InternalServerError,
            into_response = self
        )]
        #[display("Internal server error")]
        Io(io::Error),
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            error_code = ErrorCode::InternalServerError,
            into_response = self
        )]
        #[display("Internal server error")]
        Image(ImageError),
    };
}

#[derive(Debug, Display, Error, SmartDefault, ApiError)]
#[display("Invalid image type, accepted: {accepted}, expected: {expected}")]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
    error_code = ErrorCode::InvalidImageType
)]
pub struct InvalidImageTypeOld {
    accepted: String,
    expected: &'static str,
}

impl InvalidImageTypeOld {
    pub fn from_accepted(accepted: impl Into<String>) -> Self {
        Self {
            accepted: accepted.into(),
            ..Default::default()
        }
    }
}
#[derive(Debug, Error, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
    error_code = ErrorCode::InvalidImageType
)]
pub struct InvalidImageType {
    accepted: Option<ImageFormat>,
    expected: &'static [ImageFormat],
}

impl InvalidImageType {
    pub const fn new(
        accepted: ImageFormat,
        expected: &'static [ImageFormat],
    ) -> Self {
        Self {
            accepted: Some(accepted),
            expected,
        }
    }

    pub const fn unknown(expected: &'static [ImageFormat]) -> Self {
        Self {
            accepted: None,
            expected,
        }
    }
}

impl std::fmt::Display for InvalidImageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let accepted_name = self
            .accepted
            .and_then(|accepted| accepted.extensions_str().first())
            .map_or("unknown or unreadable format", |v| v);

        write!(
            f,
            "Invalid image type, accepted: {}, expected: {:#?}",
            accepted_name, self.expected
        )
    }
}

#[derive(Debug, Error)]
pub struct InvalidImageFileSize {
    accepted: ByteSize,
    range: Range<ByteSize>,
}

impl std::fmt::Display for InvalidImageFileSize {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.accepted < self.range.start {
            write!(
                f,
                "Image too small, min: {}, accepted: {}",
                self.range.start, self.accepted
            )
        } else {
            write!(
                f,
                "Image too large, max: {}, accepted: {}",
                self.range.end, self.accepted
            )
        }
    }
}

#[derive(Debug, Error)]
pub struct InvalidImageSize {
    width: u32,
    height: u32,
    width_limit: Range<u32>,
    height_limit: Range<u32>,
}

impl std::fmt::Display for InvalidImageSize {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let min_size =
            format!("{} x {}", self.width_limit.start, self.height_limit.start);
        let max_size =
            format!("{} x {}", self.width_limit.end, self.height_limit.end);
        let image_size = format!("{} x {}", self.width, self.height);
        write!(
            f,
            "Invalid image size, min: {min_size}, max: {max_size}, accepted: {image_size}",
        )
    }
}

pub struct ImageValidationResult {
    pub extension: String,
}

pub struct ImageValidatorOption {
    pub valid_formats: &'static [ImageFormat],
    pub file_size_limit: Range<Option<ByteSize>>,
    pub width_limit: Range<Option<u32>>,
    pub height_limit: Range<Option<u32>>,
}

pub struct ImageValidator {
    option: ImageValidatorOption,
}

impl ImageValidator {
    pub const fn new(option: ImageValidatorOption) -> Self {
        Self { option }
    }

    fn validate_size(
        &self,
        width: u32,
        height: u32,
    ) -> Result<(), InvalidImageSize> {
        let width_limit = self.option.width_limit.start.unwrap_or(0)
            ..self.option.width_limit.end.unwrap_or(u32::MAX);
        let height_limit = self.option.height_limit.start.unwrap_or(0)
            ..self.option.height_limit.end.unwrap_or(u32::MAX);

        if width_limit.contains(&width) && height_limit.contains(&height) {
            Ok(())
        } else {
            Err(InvalidImageSize {
                width,
                height,
                width_limit,
                height_limit,
            })
        }
    }

    fn validate_file_size(
        &self,
        size: ByteSize,
    ) -> Result<(), InvalidImageFileSize> {
        let range = &self.option.file_size_limit;
        if range.contains(&Some(size)) {
            Ok(())
        } else {
            Err(InvalidImageFileSize {
                accepted: size,
                range: (range.start.unwrap_or(ByteSize(0)))
                    ..(range.end.unwrap_or(ByteSize(u64::MAX))),
            })
        }
    }

    fn validate_format(
        &self,
        format: ImageFormat,
    ) -> Result<(), InvalidImageType> {
        if self.option.valid_formats.contains(&format) {
            Ok(())
        } else {
            Err(InvalidImageType::new(format, self.option.valid_formats))
        }
    }

    pub fn validate(
        &self,
        buffer: &[u8],
    ) -> Result<ImageValidationResult, ValidationError> {
        self.validate_file_size(ByteSize(
            // We don't use 128-bit computers, so it is safe to unwrap here
            buffer.len().try_into().unwrap(),
        ))?;

        let reader =
            ImageReader::new(io::Cursor::new(buffer)).with_guessed_format()?;

        let format = reader.format().ok_or_else(|| {
            ValidationError::InvalidType(InvalidImageType::unknown(
                self.option.valid_formats,
            ))
        })?;

        self.validate_format(format)?;

        let image = reader.decode()?;
        let (width, height) = image.dimensions();

        self.validate_size(width, height)?;

        Ok(ImageValidationResult {
            extension: (*format.extensions_str().first().unwrap()).to_string(),
        })
    }
}

pub trait AsyncImageStorage: Send + Sync {
    type File;
    type Error;

    async fn create(
        &self,
        path: impl AsRef<Path>,
        data: &[u8],
    ) -> Result<Self::File, Self::Error>;

    async fn remove(
        &self,
        path: impl AsRef<Path> + Send + Sync,
    ) -> Result<(), Self::Error>;
}
