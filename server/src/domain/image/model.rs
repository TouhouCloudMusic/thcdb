use std::path::PathBuf;

use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use bon::Builder;
use chrono::{DateTime, FixedOffset};
use entity::enums::StorageBackend;
use entity::image::Model as DbModel;
pub use entity::image_reference::Model as ImageRef;
use macros::AutoMapper;
use xxhash_rust::xxh3::xxh3_128;

use crate::domain::image::ParsedImage;

#[derive(Clone, Debug, AutoMapper, Builder)]
#[mapper(from(DbModel))]
pub struct Image {
    pub id: i32,
    /// Filename with extension
    pub filename: String,
    pub directory: String,
    pub uploaded_by: i32,
    pub uploaded_at: DateTime<FixedOffset>,
    pub backend: StorageBackend,
}

impl Image {
    pub fn full_path(&self) -> PathBuf {
        PathBuf::from_iter([&self.directory, &self.filename])
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
