use std::io;
use std::path::{Path, PathBuf};
use std::range::RangeInclusive;

use axum::http::StatusCode;
use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use bon::Builder;
use bytesize::ByteSize;
use derive_more::{Display, Error};
use error_set::error_set;
use image::{GenericImageView, ImageError, ImageFormat, ImageReader};
use macros::ApiError;
use xxhash_rust::xxh3::xxh3_128;

use crate::domain::model::image::Image;
use crate::error::{ErrorCode, InternalError};

error_set! {
    #[derive(ApiError)]
    ValidationError = {
        InvalidType(InvalidForamt),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::BadRequest,
            into_response = self
        )]
        InvalidFileSize(InvalidFileSize),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::BadRequest,
            into_response = self
        )]
        InvalidSize(InvalidSize),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::BadRequest,
            into_response = self
        )]
        InvalidRatio(InvalidRatio),
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

#[derive(Debug, Error, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
    error_code = ErrorCode::InvalidImageType
)]
pub struct InvalidForamt {
    accepted: Option<ImageFormat>,
    expected: &'static [ImageFormat],
}

impl InvalidForamt {
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

impl std::fmt::Display for InvalidForamt {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let accepted_name = self
            .accepted
            .and_then(|accepted| accepted.extensions_str().first())
            .map_or("unknown or unreadable format", |v| v);

        write!(
            f,
            "Invalid image format, accepted: {}, expected: {:#?}",
            accepted_name, self.expected
        )
    }
}

#[derive(Debug, Error)]
pub struct InvalidFileSize {
    accepted: ByteSize,
    range: RangeInclusive<ByteSize>,
}

impl std::fmt::Display for InvalidFileSize {
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
pub struct InvalidSize {
    width: u32,
    height: u32,
    width_range: RangeInclusive<u32>,
    height_range: RangeInclusive<u32>,
}

impl std::fmt::Display for InvalidSize {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let min_size =
            format!("{} x {}", self.width_range.start, self.height_range.start);
        let max_size =
            format!("{} x {}", self.width_range.end, self.height_range.end);
        let image_size = format!("{} x {}", self.width, self.height);
        write!(
            f,
            "Invalid image size, min: {min_size}, max: {max_size}, accepted: {image_size}",
        )
    }
}

#[derive(Debug, Display)]
pub enum Ratio {
    Int(u8),
    Float(f64),
}

impl From<u8> for Ratio {
    fn from(v: u8) -> Self {
        Self::Int(v)
    }
}

impl From<u32> for Ratio {
    #[expect(clippy::cast_possible_truncation)]
    fn from(v: u32) -> Self {
        Self::Int(v as u8)
    }
}

impl From<f64> for Ratio {
    fn from(v: f64) -> Self {
        Self::Float(v)
    }
}

#[derive(Debug, Error, Display)]
#[display(
    "Invalid image ratio, accepted: {accepted:.2}, expected: {expected:.2}"
)]
pub struct InvalidRatio {
    accepted: f64,
    expected: f64,
}

impl InvalidRatio {
    pub const fn new(accepted: f64, expected: f64) -> Self {
        Self { accepted, expected }
    }
}

pub struct ParsedImage {
    pub bytes: Vec<u8>,
    pub extension: &'static str,
}

#[derive(Builder)]
pub struct ParseOption {
    valid_formats: &'static [ImageFormat],
    /// The file size range of the image, default [100 kib, 10 mib]
    #[builder(into, default = ByteSize::kib(100)..=ByteSize::mib(10))]
    file_size_range: RangeInclusive<ByteSize>,
    /// The width range of the image, default is [128px, 4096px]
    #[builder(into, default = 128..=4096)]
    width_range: RangeInclusive<u32>,
    /// The height range of the image, default is [128px, 4096px]
    #[builder(into, default = 128..=4096)]
    height_range: RangeInclusive<u32>,
    #[builder(into)]
    ratio: Option<Ratio>,
    /// Target image format, default is WebP
    ///
    /// If the image is not in this format, it will be converted to this format
    #[builder(required, default = Some(ImageFormat::WebP))]
    convert_to: Option<ImageFormat>,
}

use parse_option_builder::{IsUnset, SetHeightRange, SetWidthRange};

impl<S: parse_option_builder::State> ParseOptionBuilder<S> {
    pub fn size_range(
        self,
        value: impl Into<RangeInclusive<u32>>,
    ) -> ParseOptionBuilder<SetHeightRange<SetWidthRange<S>>>
    where
        S::HeightRange: IsUnset,
        S::WidthRange: IsUnset,
    {
        let range = value.into();
        self.width_range(range).height_range(range)
    }
}

pub struct Parser {
    option: ParseOption,
}

impl Parser {
    pub const fn new(option: ParseOption) -> Self {
        Self { option }
    }

    fn validate_size(
        &self,
        width: u32,
        height: u32,
    ) -> Result<(), InvalidSize> {
        let width_range = self.option.width_range;
        let height_range = self.option.height_range;

        if width_range.contains(&width) && height_range.contains(&height) {
            Ok(())
        } else {
            Err(InvalidSize {
                width,
                height,
                width_range,
                height_range,
            })
        }
    }

    fn validate_file_size(
        &self,
        size: ByteSize,
    ) -> Result<(), InvalidFileSize> {
        let range = &self.option.file_size_range;
        if range.contains(&size) {
            Ok(())
        } else {
            Err(InvalidFileSize {
                accepted: size,
                range: *range,
            })
        }
    }

    fn validate_format(
        &self,
        format: ImageFormat,
    ) -> Result<(), InvalidForamt> {
        if self.option.valid_formats.contains(&format) {
            Ok(())
        } else {
            Err(InvalidForamt::new(format, self.option.valid_formats))
        }
    }

    fn validate_ratio(&self, ratio: f64) -> Result<(), InvalidRatio> {
        fn is_valid_ratio(
            target_ratio: f64,
            tolerance: f64,
            ratio: f64,
        ) -> bool {
            (ratio - target_ratio).abs() <= tolerance
        }

        self.option.ratio.as_ref().map_or(Ok(()), |r| {
            let target = match r {
                Ratio::Int(i) => f64::from(*i),
                Ratio::Float(f) => *f,
            };
            if is_valid_ratio(target, 0.01, ratio) {
                Ok(())
            } else {
                Err(InvalidRatio::new(ratio, target))
            }
        })
    }

    pub fn parse(&self, bytes: &[u8]) -> Result<ParsedImage, ValidationError> {
        self.validate_file_size(ByteSize(
            // We don't use 128-bit computers, so it is safe to unwrap here
            bytes.len().try_into().unwrap(),
        ))?;

        let reader =
            ImageReader::new(io::Cursor::new(bytes)).with_guessed_format()?;

        let format = reader.format().ok_or_else(|| {
            ValidationError::InvalidType(InvalidForamt::unknown(
                self.option.valid_formats,
            ))
        })?;

        self.validate_format(format)?;

        let image = reader.decode()?;
        let (width, height) = image.dimensions();

        self.validate_size(width, height)?;

        self.validate_ratio(f64::from(width) / f64::from(height))?;

        if let Some(convert_to) = self.option.convert_to
            && format != convert_to
        {
            let mut buffer = Vec::new();
            image.write_to(&mut io::Cursor::new(&mut buffer), convert_to)?;
            Ok(ParsedImage {
                bytes: buffer,
                extension: convert_to.extensions_str().first().unwrap(),
            })
        } else {
            Ok(ParsedImage {
                bytes: image.into_bytes(),
                extension: format.extensions_str().first().unwrap(),
            })
        }
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

#[derive(Debug, thiserror::Error, ApiError)]
pub enum Error {
    #[error(transparent)]
    Validation(#[from] ValidationError),
    #[error(transparent)]
    Internal(InternalError),
}

impl<T> From<T> for Error
where
    T: Into<InternalError>,
{
    fn from(e: T) -> Self {
        Self::Internal(e.into())
    }
}

#[derive(Clone, bon::Builder)]
pub struct Service<R, S>
where
    R: super::Repository,
    S: AsyncImageStorage,
{
    repo: R,
    storage: S,
}

pub trait ServiceTrait: Send + Sync {
    type Error;

    async fn create(
        &self,
        buffer: &[u8],
        parser: &Parser,
        uploader_id: i32,
    ) -> Result<entity::image::Model, Self::Error>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error>;
}

impl<Repo, Storage> ServiceTrait for Service<Repo, Storage>
where
    Repo: super::Repository,
    Storage: AsyncImageStorage,
    Repo::Error: Into<InternalError>,
    Storage::Error: Into<InternalError>,
{
    type Error = Error;
    async fn create(
        &self,
        buffer: &[u8],
        parser: &Parser,
        uploader_id: i32,
    ) -> Result<entity::image::Model, Self::Error> {
        let ParsedImage {
            extension, bytes, ..
        } = parser.parse(buffer)?;
        let xxhash = xxh3_128(&bytes);

        let base64_hash = BASE64_URL_SAFE_NO_PAD.encode(xxhash.to_be_bytes());
        let ImgPath {
            filename,
            sub_dir,
            full_path,
        } = ImgPath::from_hash_and_ext(&base64_hash, extension);

        if let Some(image) = self.repo.find_by_filename(&filename).await? {
            Ok(image)
        } else {
            let new_img = Image::builder()
                .filename(filename)
                // All chars of sub dir are valid ascii, so unwrap is safe
                .directory(sub_dir.to_str().unwrap().to_string())
                .uploaded_by(uploader_id)
                .build();

            let image = self.repo.save(new_img).await?;

            self.storage.create(&full_path, &bytes).await?;

            Ok(image)
        }
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error> {
        Ok(self.repo.find_by_filename(filename).await?)
    }
}

struct ImgPath {
    pub filename: String,
    pub sub_dir: PathBuf,
    pub full_path: PathBuf,
}

impl ImgPath {
    pub fn from_hash_and_ext(file_hash: &str, extension: &str) -> Self {
        let filename = format!("{file_hash}.{extension}",);

        let sub_dir = PathBuf::from(&file_hash[0..2]).join(&file_hash[2..4]);
        let full_path = sub_dir.join(&filename);

        Self {
            filename,
            sub_dir,
            full_path,
        }
    }
}

#[cfg(test)]
mod test {
    use std::path::PathBuf;

    use super::ImgPath;

    #[test]

    fn fs_path() {
        let file_hash = "1234567890abcdef1234567890abcdef";
        let extension = "png";
        let ImgPath {
            filename,
            sub_dir,
            full_path,
        } = ImgPath::from_hash_and_ext(file_hash, extension);

        assert_eq!(filename, "1234567890abcdef1234567890abcdef.png");
        assert_eq!(sub_dir, PathBuf::from("12/34"));
        assert_eq!(sub_dir.to_str().unwrap(), "12/34");
        assert_eq!(
            full_path,
            PathBuf::from("12/34/1234567890abcdef1234567890abcdef.png")
        );
        assert_eq!(
            full_path.to_string_lossy(),
            "12/34/1234567890abcdef1234567890abcdef.png"
        );
    }
}
