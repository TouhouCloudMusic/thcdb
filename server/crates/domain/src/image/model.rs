use std::path::PathBuf;

use bon::Builder;
use chrono::{DateTime, FixedOffset};
use entity::enums::StorageBackend;
use entity::image::Model as DbModel;
use macros::AutoMapper;

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

#[cfg(test)]
mod test {

    use crate::image::Image;

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
