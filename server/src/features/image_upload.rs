use std::io;
use std::path::PathBuf;
use std::range::RangeInclusive;

use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use bon::Builder;
use bytesize::ByteSize;
use domain::image::Image;
use entity::enums::StorageBackend;
use image::{GenericImageView, ImageError, ImageFormat, ImageReader};
use infra_db::SeaOrmTxRepo;
use libfp::FunctorExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, EntityTrait, IntoActiveModel, IntoActiveValue, QueryFilter,
};
use xxhash_rust::xxh3::xxh3_128;

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::InternalError;

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

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("{_0}")]
    #[from]
    InvalidInput(#[error(source)] ImageInputError),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl From<ImageError> for Error {
    fn from(source: ImageError) -> Self {
        match source {
            ImageError::Decoding(_)
            | ImageError::IoError(_)
            | ImageError::Limits(_)
            | ImageError::Unsupported(_) => {
                ImageInputError::Data(source).into()
            }
            ImageError::Encoding(_) | ImageError::Parameter(_) => {
                InternalError::new(source).into()
            }
        }
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
    #[builder(into, default = ByteSize::kib(100)..=ByteSize::mib(10))]
    file_size_range: RangeInclusive<ByteSize>,
    #[builder(into, default = 128..=4096)]
    width_range: RangeInclusive<u32>,
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

    pub fn parse(&self, bytes: &[u8]) -> Result<ParsedImage, Error> {
        self.validate_file_size(ByteSize(
            bytes.len().try_into().expect("image size should fit u64"),
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

#[derive(Builder, Clone, Debug)]
pub struct NewImage {
    pub directory: String,
    pub uploaded_by: i32,
    pub backend: StorageBackend,
    pub bytes: Vec<u8>,

    file_hash: String,
    extension: &'static str,
}

impl NewImage {
    pub fn from_parsed(
        parsed: ParsedImage,
        uploaded_by: i32,
        backend: StorageBackend,
    ) -> Self {
        let ParsedImage {
            extension, bytes, ..
        } = parsed;
        let xxhash = xxh3_128(&bytes);

        let file_hash = BASE64_URL_SAFE_NO_PAD.encode(xxhash.to_be_bytes());

        let sub_dir = PathBuf::from(&file_hash[0..2]).join(&file_hash[2..4]);

        Self {
            file_hash,
            extension,
            directory: sub_dir.to_str().unwrap().to_string(),
            uploaded_by,
            backend,
            bytes,
        }
    }

    pub fn full_path(&self) -> PathBuf {
        PathBuf::from_iter([&self.directory, &self.file_hash])
            .with_extension(self.extension)
    }

    pub fn filename(&self) -> String {
        format!("{}.{}", self.file_hash, self.extension)
    }
}

impl IntoActiveModel<entity::image::ActiveModel> for &NewImage {
    fn into_active_model(self) -> entity::image::ActiveModel {
        entity::image::ActiveModel {
            id: NotSet,
            filename: self.filename().into_active_value(),
            directory: self.directory.clone().into_active_value(),
            uploaded_by: self.uploaded_by.into_active_value(),
            uploaded_at: NotSet,
            backend: Set(self.backend),
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

pub struct CreateImageMeta {
    pub uploaded_by: i32,
}

#[derive(Clone, bon::Builder)]
pub struct Service<S> {
    tx: SeaOrmTxRepo,
    storage: S,
}

impl<S> Service<S> {
    pub const fn new(tx: SeaOrmTxRepo, storage: S) -> Self {
        Self { tx, storage }
    }
}

impl<Storage> Service<Storage>
where
    Storage: AsyncFileStorage,
{
    pub async fn create(
        &self,
        bytes: &[u8],
        parser: &Parser,
        meta: CreateImageMeta,
    ) -> Result<Image, Error> {
        let parsed = parser.parse(bytes)?;
        let new_image =
            NewImage::from_parsed(parsed, meta.uploaded_by, StorageBackend::Fs);

        let image = if let Some(image) =
            find_by_filename(&self.tx, &new_image).await?
        {
            image
        } else {
            let image = create(&self.tx, &new_image).await?;
            self.storage.create(new_image).await?;
            image
        };

        Ok(image)
    }

    async fn delete(&self, image: Image) -> Result<(), Error> {
        delete(&self.tx, image.id).await?;
        self.storage.remove(image).await?;

        Ok(())
    }
}

async fn find_by_filename(
    tx: &SeaOrmTxRepo,
    new_image: &NewImage,
) -> Result<Option<Image>, DatabaseError> {
    entity::image::Entity::find()
        .filter(entity::image::Column::Filename.eq(new_image.filename()))
        .one(tx.conn())
        .await
        .db_operation("find image by filename")
        .map(FunctorExt::fmap_into)
}

async fn create(
    tx: &SeaOrmTxRepo,
    new_image: &NewImage,
) -> Result<Image, DatabaseError> {
    entity::image::Entity::insert(new_image.into_active_model())
        .exec_with_returning(tx.conn())
        .await
        .db_operation("create image")
        .fmap_into()
}

async fn delete(tx: &SeaOrmTxRepo, id: i32) -> Result<(), DatabaseError> {
    entity::image::Entity::delete_many()
        .filter(entity::image::Column::Id.eq(id))
        .exec(tx.conn())
        .await
        .db_operation("delete image")
        .map(|_| ())
}
