use std::path::PathBuf;

use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use bon::Builder;
use chrono::{DateTime, FixedOffset};
use entity::enums::StorageBackend;
use entity::image::Model as DbModel;
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
        Image::full_path_impl(&self.directory, &self.filename)
    }

    fn full_path_impl(directory: &str, filename: &str) -> PathBuf {
        PathBuf::from_iter([directory, filename])
    }

    pub fn url(&self) -> String {
        Self::format_url(self.backend, &self.directory, &self.filename)
    }

    pub fn format_url(
        backend: StorageBackend,
        directory: &str,
        filename: &str,
    ) -> String {
        match backend {
            StorageBackend::Fs => Image::full_path_impl(directory, filename)
                .to_string_lossy()
                .to_string(),
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

#[cfg(test)]
mod test {

    use crate::domain::image::Image;

    #[test]
    fn image_path_gen() {
        let image = Image {
            id: 0,
            filename: "test_hash.png".to_string(),
            directory: "test_dir/bar/".to_string(),
            uploaded_by: 0,
            uploaded_at: chrono::Utc::now().into(),
            backend: entity::enums::StorageBackend::Fs,
        };

        assert_eq!(
            image.full_path().to_str().unwrap(),
            "test_dir/bar/test_hash.png"
        );
    }
}
