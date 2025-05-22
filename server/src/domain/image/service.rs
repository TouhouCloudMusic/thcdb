use std::io;
use std::range::RangeInclusive;

use axum::http::StatusCode;
use bon::Builder;
use boolinator::Boolinator;
use bytesize::ByteSize;
use derive_more::{Display, Error};
use entity::enums::{ImageRefEntityType, StorageBackend};
use error_set::error_set;
use image::{GenericImageView, ImageError, ImageFormat, ImageReader};
use macros::ApiError;

use crate::domain::image::model::{Image, ImageRef, NewImage};
use crate::domain::repository::Transaction;
use crate::infra::{self};

error_set! {
    #[derive(ApiError)]
    ValidationError = {
        InvalidType(InvalidForamt),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            into_response = self
        )]
        InvalidFileSize(InvalidFileSize),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            into_response = self
        )]
        InvalidSize(InvalidSize),
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            into_response = self
        )]
        InvalidRatio(InvalidRatio),
        // TODO: Internal error wrapper
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            into_response = self
        )]
        #[display("Internal server error")]
        Io(io::Error),
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            into_response = self
        )]
        #[display("Internal server error")]
        Image(ImageError),
    };
}

#[derive(Debug, Error, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
)]
pub struct InvalidForamt {
    received: Option<ImageFormat>,
    expected: &'static [ImageFormat],
}

impl InvalidForamt {
    pub const fn new(
        received: ImageFormat,
        expected: &'static [ImageFormat],
    ) -> Self {
        Self {
            received: Some(received),
            expected,
        }
    }

    pub const fn unknown(expected: &'static [ImageFormat]) -> Self {
        Self {
            received: None,
            expected,
        }
    }
}

impl std::fmt::Display for InvalidForamt {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let received_name = self
            .received
            .and_then(|received| received.extensions_str().first())
            .map_or("unknown or unreadable format", |v| v);

        write!(
            f,
            "Invalid image format, received: {}, expected: {:#?}",
            received_name, self.expected
        )
    }
}

#[derive(Debug, Error)]
pub struct InvalidFileSize {
    received: ByteSize,
    range: RangeInclusive<ByteSize>,
}

impl std::fmt::Display for InvalidFileSize {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.received < self.range.start {
            write!(
                f,
                "Image too small, min: {}, received: {}",
                self.range.start, self.received
            )
        } else {
            write!(
                f,
                "Image too large, max: {}, received: {}",
                self.range.end, self.received
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
            "Invalid image size, min: {min_size}, max: {max_size}, received: {image_size}",
        )
    }
}

#[derive(Debug, Error, Display)]
#[display(
    "Invalid image ratio, received: {received:.2}, expected: {:.2} to {:.2}",
    expected.start, expected.end
)]
pub struct InvalidRatio {
    received: f64,
    expected: RangeInclusive<f64>,
}

impl InvalidRatio {
    pub const fn new(received: f64, expected: RangeInclusive<f64>) -> Self {
        Self { received, expected }
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
    #[builder(with = |ratio: impl Into<RangeInclusive<f64>>| {
        const DEVIATION: f64 = 0.01;
        let mut ratio = ratio.into();

        ratio.start *= 1f64 - DEVIATION;
        ratio.end *= 1f64 + DEVIATION;

        ratio
    })]
    ratio: RangeInclusive<f64>,
    /// Target image format, default is WebP
    ///
    /// If the image is not in this format, it will be converted to this format
    #[builder(required, default = Some(ImageFormat::WebP))]
    convert_to: Option<ImageFormat>,
}

impl ParseOption {
    pub const SQUARE: RangeInclusive<f64> = RangeInclusive {
        start: 1.0,
        end: 1.0,
    };

    pub const fn into_parser(self) -> Parser {
        Parser::new(self)
    }
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
                received: size,
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
        self.option
            .ratio
            .contains(&ratio)
            .ok_or(InvalidRatio::new(ratio, self.option.ratio))
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
    type Error: Into<infra::ErrorEnum>;

    async fn create(&self, image: NewImage) -> Result<Self::File, Self::Error>;

    async fn remove(&self, image: Image) -> Result<(), Self::Error>;
}

#[derive(Debug, thiserror::Error, ApiError)]
pub enum Error {
    #[error(transparent)]
    Validation(#[from] ValidationError),
    #[error(transparent)]
    Infra(infra::Error),
}

impl<T> From<T> for Error
where
    T: Into<infra::Error>,
{
    fn from(e: T) -> Self {
        Self::Infra(e.into())
    }
}

#[derive(Clone, bon::Builder)]
pub struct Service<R, S> {
    repo: R,
    storage: S,
}

impl<R, S> Service<R, S> {
    pub const fn new(repo: R, storage: S) -> Self {
        Self { repo, storage }
    }
}

impl<Repo, Storage> Service<Repo, Storage>
where
    Repo: super::Repo,
    Storage: AsyncImageStorage,
{
    pub async fn find_by_id(&self, id: i32) -> Result<Option<Image>, Error> {
        Ok(self.repo.find_by_id(id).await?)
    }

    pub async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, Error> {
        Ok(self.repo.find_by_filename(filename).await?)
    }
}

pub struct CreateImageMeta {
    pub entity_id: i32,
    pub entity_type: ImageRefEntityType,
    pub usage: Option<String>,
    pub uploaded_by: i32,
}

impl<Tx, Storage> Service<Tx, Storage>
where
    Tx: Transaction + super::Repo + super::repository::TxRepo,
    Storage: AsyncImageStorage,
{
    pub async fn create(
        &self,
        bytes: &[u8],
        parser: &Parser,
        meta: CreateImageMeta,
    ) -> Result<Image, Error> {
        let tx = &self.repo;
        let parsed = parser.parse(bytes)?;

        // TODO: Support more storage
        let new_image =
            NewImage::from_parsed(parsed, meta.uploaded_by, StorageBackend::Fs);

        // We use xxhash128, so if the hash is the same, it is the same image.
        let image = if let Some(image) =
            tx.find_by_filename(&new_image.filename()).await?
        {
            image
        } else {
            let image = tx.create(&new_image).await?;
            self.storage.create(new_image).await?;
            image
        };

        // Create image reference
        let image_ref = entity::image_reference::Model {
            image_id: image.id,
            ref_entity_id: meta.uploaded_by,
            ref_entity_type: meta.entity_type,
            ref_usage: meta.usage,
        };
        self.repo.create_ref(image_ref).await?;

        Ok(image)
    }

    async fn delete(&self, image: Image) -> Result<(), Error> {
        self.repo.delete(image.id).await?;

        self.storage.remove(image).await?;

        Ok(())
    }

    /// Decrement the reference count for an image and delete it if no references remain
    pub async fn decr_ref_count(
        &self,
        image_ref: ImageRef,
    ) -> Result<(), Error> {
        self.repo.remove_ref(image_ref.clone()).await?;

        // Check if this was the last reference
        let count = self.repo.ref_count(image_ref.image_id).await?;
        if count == 0 {
            // Get the image and delete it
            if let Some(image) =
                self.repo.find_by_id(image_ref.image_id).await?
            {
                self.delete(image).await?;
            }
        }

        Ok(())
    }
}
