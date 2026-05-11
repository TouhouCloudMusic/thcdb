use std::io;
use std::panic::Location;
use std::range::RangeInclusive;

use axum::response::IntoResponse;
use bon::Builder;
use bytesize::ByteSize;
use entity::enums::StorageBackend;
use image::{GenericImageView, ImageError, ImageFormat, ImageReader};

use crate::domain::image::{Image, NewImage};
use crate::infra::{self};
use crate::shared::http::api_response::AppError;

#[derive(Debug)]
pub enum ValidationError {
    InvalidType {
        source: InvalidFormat,
    },
    InvalidFileSize {
        source: InvalidFileSize,
        location: &'static Location<'static>,
    },
    InvalidSize {
        source: InvalidSize,
        location: &'static Location<'static>,
    },
    InvalidRatio {
        source: InvalidRatio,
        location: &'static Location<'static>,
    },
    Io {
        source: io::Error,
        location: &'static Location<'static>,
    },
    Image {
        source: ImageError,
        location: &'static Location<'static>,
    },
}

impl From<InvalidFormat> for ValidationError {
    fn from(source: InvalidFormat) -> Self {
        Self::InvalidType { source }
    }
}

impl From<InvalidFileSize> for ValidationError {
    #[track_caller]
    fn from(source: InvalidFileSize) -> Self {
        Self::InvalidFileSize {
            source,
            location: Location::caller(),
        }
    }
}

impl From<InvalidSize> for ValidationError {
    #[track_caller]
    fn from(source: InvalidSize) -> Self {
        Self::InvalidSize {
            source,
            location: Location::caller(),
        }
    }
}

impl From<InvalidRatio> for ValidationError {
    #[track_caller]
    fn from(source: InvalidRatio) -> Self {
        Self::InvalidRatio {
            source,
            location: Location::caller(),
        }
    }
}

impl From<io::Error> for ValidationError {
    #[track_caller]
    fn from(source: io::Error) -> Self {
        Self::Io {
            source,
            location: Location::caller(),
        }
    }
}

impl From<ImageError> for ValidationError {
    #[track_caller]
    fn from(source: ImageError) -> Self {
        Self::Image {
            source,
            location: Location::caller(),
        }
    }
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidType { source } => write!(f, "{source}"),
            Self::InvalidFileSize { source, .. } => {
                write!(f, "Invalid file size: {source}")
            }
            Self::InvalidSize { source, .. } => {
                write!(f, "Invalid size: {source}")
            }
            Self::InvalidRatio { source, .. } => {
                write!(f, "Invalid ratio: {source}")
            }
            Self::Io { .. } | Self::Image { .. } => {
                write!(f, "Internal server error")
            }
        }
    }
}

impl std::error::Error for ValidationError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidType { source } => Some(source),
            Self::InvalidFileSize { source, .. } => Some(source),
            Self::InvalidSize { source, .. } => Some(source),
            Self::InvalidRatio { source, .. } => Some(source),
            Self::Io { source, .. } => Some(source),
            Self::Image { source, .. } => Some(source),
        }
    }
}

impl From<ValidationError> for AppError {
    fn from(err: ValidationError) -> Self {
        match &err {
            ValidationError::InvalidType { .. }
            | ValidationError::InvalidFileSize { .. }
            | ValidationError::InvalidSize { .. }
            | ValidationError::InvalidRatio { .. } => {
                let message = err.to_string();
                AppError::bad_request(message)
            }
            ValidationError::Io { .. } | ValidationError::Image { .. } => {
                AppError::internal(err)
            }
        }
    }
}

#[derive(Debug, derive_more::Error)]
pub struct InvalidFormat {
    received: Option<ImageFormat>,
    expected: &'static [ImageFormat],
    location: &'static Location<'static>,
}

impl InvalidFormat {
    #[track_caller]
    pub const fn new(
        received: ImageFormat,
        expected: &'static [ImageFormat],
    ) -> Self {
        Self {
            received: Some(received),
            expected,
            location: Location::caller(),
        }
    }

    #[track_caller]
    pub const fn unknown(expected: &'static [ImageFormat]) -> Self {
        Self {
            received: None,
            expected,
            location: Location::caller(),
        }
    }
}

impl std::fmt::Display for InvalidFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let received = self
            .received
            .and_then(|r| r.extensions_str().first().copied())
            .unwrap_or("unknown or unreadable format");
        write!(
            f,
            "Invalid image format, received: {received}, expected: {:#?}",
            self.expected
        )
    }
}

#[derive(Debug, derive_more::Error)]
pub struct InvalidFileSize {
    received: ByteSize,
    range: RangeInclusive<ByteSize>,
    location: &'static Location<'static>,
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
                self.range.last, self.received
            )
        }
    }
}

#[derive(Debug, derive_more::Error)]
pub struct InvalidSize {
    width: u32,
    height: u32,
    width_range: RangeInclusive<u32>,
    height_range: RangeInclusive<u32>,
    location: &'static Location<'static>,
}

impl std::fmt::Display for InvalidSize {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Invalid image size, min: {} x {}, max: {} x {}, received: {} x {}",
            self.width_range.start,
            self.height_range.start,
            self.width_range.last,
            self.height_range.last,
            self.width,
            self.height
        )
    }
}

#[derive(Debug, derive_more::Error)]
pub struct InvalidRatio {
    received: f64,
    expected: RangeInclusive<f64>,
    location: &'static Location<'static>,
}

impl InvalidRatio {
    #[track_caller]
    pub const fn new(received: f64, expected: RangeInclusive<f64>) -> Self {
        Self {
            received,
            expected,
            location: Location::caller(),
        }
    }
}

impl std::fmt::Display for InvalidRatio {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Invalid image ratio, received: {:.2}, expected: {:.2} to {:.2}",
            self.received, self.expected.start, self.expected.last
        )
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
        ratio.last *= 1f64 + DEVIATION;

        ratio
    })]
    ratio: Option<RangeInclusive<f64>>,
    /// Target image format, default is WebP
    ///
    /// If the image is not in this format, it will be converted to this format
    #[builder(required, default = Some(ImageFormat::WebP))]
    convert_to: Option<ImageFormat>,
}

impl ParseOption {
    pub const SQUARE: RangeInclusive<f64> = RangeInclusive {
        start: 1.0,
        last: 1.0,
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
                location: Location::caller(),
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
                location: Location::caller(),
            })
        }
    }

    fn validate_format(
        &self,
        format: ImageFormat,
    ) -> Result<(), InvalidFormat> {
        if self.option.valid_formats.contains(&format) {
            Ok(())
        } else {
            Err(InvalidFormat::new(format, self.option.valid_formats))
        }
    }

    fn validate_ratio(&self, ratio: f64) -> Result<(), InvalidRatio> {
        let Some(expected) = self.option.ratio else {
            return Ok(());
        };

        expected
            .contains(&ratio)
            .ok_or(InvalidRatio::new(ratio, expected))
    }

    pub fn parse(&self, bytes: &[u8]) -> Result<ParsedImage, ValidationError> {
        self.validate_file_size(ByteSize(
            // We don't use 128-bit computers, so it is safe to unwrap here
            bytes.len().try_into().unwrap(),
        ))?;

        let reader =
            ImageReader::new(io::Cursor::new(bytes)).with_guessed_format()?;

        let format =
            reader
                .format()
                .ok_or_else(|| ValidationError::InvalidType {
                    source: InvalidFormat::unknown(self.option.valid_formats),
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

pub trait AsyncFileStorage: Send + Sync {
    type File;
    type Error: Into<infra::Error>;

    async fn create(&self, image: NewImage) -> Result<Self::File, Self::Error>;

    async fn remove(&self, image: Image) -> Result<(), Self::Error>;
}

#[derive(Debug, derive_more::Error)]
pub enum Error {
    Validation {
        #[error(source)]
        source: ValidationError,
    },
    Infra {
        #[error(source)]
        source: infra::Error,
    },
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Validation { source } => write!(f, "{source}"),
            Self::Infra { source } => write!(f, "{source}"),
        }
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Validation { source } => source.into(),
            Error::Infra { source } => source.into(),
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<ValidationError> for Error {
    fn from(source: ValidationError) -> Self {
        Self::Validation { source }
    }
}

impl<T> From<T> for Error
where
    T: Into<infra::Error>,
{
    fn from(e: T) -> Self {
        Self::Infra { source: e.into() }
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
    Repo: super::Repo + Sync,
    Storage: AsyncFileStorage,
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
    pub uploaded_by: i32,
}

impl<Tx, Storage> Service<Tx, Storage>
where
    Tx: super::Repo + super::repository::TxRepo + Sync,
    Storage: AsyncFileStorage,
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

        Ok(image)
    }

    async fn delete(&self, image: Image) -> Result<(), Error> {
        self.repo.delete(image.id).await?;

        self.storage.remove(image).await?;

        Ok(())
    }
}
