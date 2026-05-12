use std::io;
use std::range::RangeInclusive;

use bon::Builder;
use bytesize::ByteSize;
use entity::enums::StorageBackend;
use image::{GenericImageView, ImageError, ImageFormat, ImageReader};

use crate::domain::image::{Image, NewImage};
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum ImageInputError {
    #[display("{_0}")]
    Format(#[error(source)] InvalidFormat),
    #[display("Invalid file size: {_0}")]
    FileSize(#[error(source)] InvalidFileSize),
    #[display("Invalid size: {_0}")]
    Size(#[error(source)] InvalidSize),
    #[display("Invalid ratio: {_0}")]
    Ratio(#[error(source)] InvalidRatio),
    #[display("Invalid image data: {_0}")]
    Data(#[error(source)] ImageError),
}

impl From<InvalidFormat> for ImageInputError {
    fn from(source: InvalidFormat) -> Self {
        Self::Format(source)
    }
}

impl From<InvalidFileSize> for ImageInputError {
    fn from(source: InvalidFileSize) -> Self {
        Self::FileSize(source)
    }
}

impl From<InvalidSize> for ImageInputError {
    fn from(source: InvalidSize) -> Self {
        Self::Size(source)
    }
}

impl From<InvalidRatio> for ImageInputError {
    fn from(source: InvalidRatio) -> Self {
        Self::Ratio(source)
    }
}

#[derive(Debug, derive_more::Error)]
pub struct InvalidFormat {
    received: Option<ImageFormat>,
    expected: &'static [ImageFormat],
}

impl InvalidFormat {
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
}

impl InvalidRatio {
    pub const fn new(received: f64, expected: RangeInclusive<f64>) -> Self {
        Self { received, expected }
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

    pub fn parse(&self, bytes: &[u8]) -> Result<ParsedImage, AppError> {
        self.validate_file_size(ByteSize(
            // We don't use 128-bit computers, so it is safe to unwrap here
            bytes.len().try_into().unwrap(),
        ))
        .map_err(ImageInputError::from)?;

        let reader = ImageReader::new(io::Cursor::new(bytes))
            .with_guessed_format()
            .map_err(InternalError::new)?;

        let format = reader.format().ok_or_else(|| {
            ImageInputError::from(InvalidFormat::unknown(
                self.option.valid_formats,
            ))
        })?;

        self.validate_format(format)
            .map_err(ImageInputError::from)?;

        let image = reader.decode()?;
        let (width, height) = image.dimensions();

        self.validate_size(width, height)
            .map_err(ImageInputError::from)?;

        self.validate_ratio(f64::from(width) / f64::from(height))
            .map_err(ImageInputError::from)?;

        if let Some(convert_to) = self.option.convert_to
            && format != convert_to
        {
            let mut buffer = Vec::new();
            image
                .write_to(&mut io::Cursor::new(&mut buffer), convert_to)
                .map_err(InternalError::new)?;
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

    async fn create(
        &self,
        image: NewImage,
    ) -> Result<Self::File, InternalError>;

    async fn remove(&self, image: Image) -> Result<(), InternalError>;
}

impl From<ImageInputError> for AppError {
    #[track_caller]
    fn from(err: ImageInputError) -> Self {
        AppError::bad_request(err.to_string())
    }
}

impl From<ImageError> for AppError {
    #[track_caller]
    fn from(err: ImageError) -> Self {
        match err {
            ImageError::Decoding(_)
            | ImageError::IoError(_)
            | ImageError::Limits(_)
            | ImageError::Unsupported(_) => ImageInputError::Data(err).into(),
            ImageError::Encoding(_) | ImageError::Parameter(_) => {
                InternalError::new(err).into()
            }
        }
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
    pub async fn find_by_id(&self, id: i32) -> Result<Option<Image>, AppError> {
        Ok(self.repo.find_by_id(id).await?)
    }

    pub async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, AppError> {
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
    ) -> Result<Image, AppError> {
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

    async fn delete(&self, image: Image) -> Result<(), AppError> {
        self.repo.delete(image.id).await?;

        self.storage.remove(image).await?;

        Ok(())
    }
}
