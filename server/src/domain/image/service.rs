use std::backtrace::Backtrace;
use std::io;
use std::range::RangeInclusive;

use axum::http::StatusCode;
use bon::Builder;
use bytesize::ByteSize;
use entity::enums::StorageBackend;
use image::{GenericImageView, ImageError, ImageFormat, ImageReader};
use macros::ApiError;

use crate::domain::image::model::{Image, NewImage};
use crate::domain::repository::Transaction;
use crate::infra::{self};

// TODO: conv to internal error
#[derive(Debug, snafu::Snafu, ApiError)]
#[snafu(module)]
pub enum ValidationError {
    #[snafu(transparent)]
    InvalidType { source: InvalidForamt },
    #[snafu(display("Invalid file size: {source}"))]
    #[api_error(
        status_code = StatusCode::BAD_REQUEST,
        into_response = self
    )]
    InvalidFileSize {
        source: InvalidFileSize,
        backtrace: Backtrace,
    },
    #[snafu(display("Invalid size: {source}"))]
    #[api_error(
        status_code = StatusCode::BAD_REQUEST,
        into_response = self
    )]
    InvalidSize {
        source: InvalidSize,
        backtrace: Backtrace,
    },
    #[snafu(display("Invalid ratio: {source}"))]
    #[api_error(
        status_code = StatusCode::BAD_REQUEST,
        into_response = self
    )]
    InvalidRatio {
        source: InvalidRatio,
        backtrace: Backtrace,
    },
    #[snafu(display("Internal server error"))]
    #[api_error(
        status_code = StatusCode::INTERNAL_SERVER_ERROR,
        into_response = self
    )]
    Io {
        source: io::Error,
        backtrace: Backtrace,
    },
    #[snafu(display("Internal server error"))]
    #[api_error(
        status_code = StatusCode::INTERNAL_SERVER_ERROR,
        into_response = self
    )]
    Image {
        source: ImageError,
        backtrace: Backtrace,
    },
}

impl From<InvalidFileSize> for ValidationError {
    fn from(source: InvalidFileSize) -> Self {
        Self::InvalidFileSize {
            source,
            backtrace: Backtrace::capture(),
        }
    }
}

impl From<InvalidSize> for ValidationError {
    fn from(source: InvalidSize) -> Self {
        Self::InvalidSize {
            source,
            backtrace: Backtrace::capture(),
        }
    }
}

impl From<InvalidRatio> for ValidationError {
    fn from(source: InvalidRatio) -> Self {
        Self::InvalidRatio {
            source,
            backtrace: Backtrace::capture(),
        }
    }
}

impl From<io::Error> for ValidationError {
    fn from(source: io::Error) -> Self {
        Self::Io {
            source,
            backtrace: Backtrace::capture(),
        }
    }
}

impl From<ImageError> for ValidationError {
    fn from(source: ImageError) -> Self {
        Self::Image {
            source,
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, snafu::Snafu, ApiError)]
#[snafu(display(
    "Invalid image format, received: {}, expected: {:#?}",
    received.and_then(|r| r.extensions_str().first().copied()).unwrap_or("unknown or unreadable format"),
    expected
))]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
)]
pub struct InvalidForamt {
    received: Option<ImageFormat>,
    expected: &'static [ImageFormat],
    backtrace: Backtrace,
}

impl InvalidForamt {
    pub fn new(
        received: ImageFormat,
        expected: &'static [ImageFormat],
    ) -> Self {
        Self {
            received: Some(received),
            expected,
            backtrace: Backtrace::capture(),
        }
    }

    pub fn unknown(expected: &'static [ImageFormat]) -> Self {
        Self {
            received: None,
            expected,
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, snafu::Snafu)]
#[snafu(display(
    "{}",
    if *received < range.start {
        format!("Image too small, min: {}, received: {}", range.start, received)
    } else {
        format!("Image too large, max: {}, received: {}", range.last, received)
    }
))]
pub struct InvalidFileSize {
    received: ByteSize,
    range: RangeInclusive<ByteSize>,
    backtrace: Backtrace,
}

#[derive(Debug, snafu::Snafu)]
#[snafu(display(
    "Invalid image size, min: {} x {}, max: {} x {}, received: {} x {}",
    width_range.start, height_range.start, width_range.last, height_range.last, width, height
))]
pub struct InvalidSize {
    width: u32,
    height: u32,
    width_range: RangeInclusive<u32>,
    height_range: RangeInclusive<u32>,
    backtrace: Backtrace,
}

#[derive(Debug, snafu::Snafu)]
#[snafu(display(
    "Invalid image ratio, received: {received:.2}, expected: {:.2} to {:.2}",
    expected.start, expected.last
))]
pub struct InvalidRatio {
    received: f64,
    expected: RangeInclusive<f64>,
    backtrace: Backtrace,
}

impl InvalidRatio {
    pub fn new(received: f64, expected: RangeInclusive<f64>) -> Self {
        Self {
            received,
            expected,
            backtrace: Backtrace::capture(),
        }
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
                backtrace: Backtrace::capture(),
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
                backtrace: Backtrace::capture(),
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

        let format =
            reader
                .format()
                .ok_or_else(|| ValidationError::InvalidType {
                    source: InvalidForamt::unknown(self.option.valid_formats),
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

#[derive(Debug, snafu::Snafu, ApiError)]

pub enum Error {
    #[snafu(transparent)]
    Validation {
        source: ValidationError,
    },
    Infra {
        source: infra::Error,
    },
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
    Repo: super::Repo,
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
    Tx: Transaction + super::Repo + super::repository::TxRepo,
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
