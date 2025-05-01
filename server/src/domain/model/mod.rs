pub mod image {
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

            let sub_dir =
                PathBuf::from(&file_hash[0..2]).join(&file_hash[2..4]);

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
            PathBuf::from_iter([
                &self.directory,
                &self.file_hash,
                self.extension,
            ])
        }

        pub fn filename(&self) -> String {
            format!("{}.{}", self.file_hash, self.extension)
        }
    }
}

pub mod auth {
    pub use auth_creds::*;
    mod auth_creds;
    pub use user_role::*;
    mod user_role;
    #[expect(unused_imports)]
    pub use verfication_code::*;
    mod verfication_code;
}

pub mod markdown {

    use std::sync::LazyLock;

    use axum::http::StatusCode;
    use derive_more::{Display, Error};
    use macros::{ApiError, IntoErrorSchema};
    use pulldown_cmark::{Event, Options, Parser, TextMergeStream};

    #[derive(Debug, Clone, Display)]
    pub struct Markdown(String);

    #[derive(Debug, Display, Error, ApiError, IntoErrorSchema)]
    #[display("Invalid markdown")]
    #[api_error(
        status_code = StatusCode::BAD_REQUEST,
    )]
    pub enum Error {
        ContainsHtml,
    }

    static OPTIONS: LazyLock<Options> = LazyLock::new(|| {
        let mut options = Options::empty();
        options.insert(Options::ENABLE_TABLES);
        options.insert(Options::ENABLE_FOOTNOTES);
        options.insert(Options::ENABLE_STRIKETHROUGH);
        options.insert(Options::ENABLE_TASKLISTS);
        options
    });

    impl Markdown {
        pub fn parse(markdown: impl Into<String>) -> Result<Self, Error> {
            fn inner(markdown: String) -> Result<Markdown, Error> {
                let parser = Parser::new_ext(&markdown, *OPTIONS);
                let stream = TextMergeStream::new(parser);
                for event in stream {
                    match event {
                        Event::Html(_) | Event::InlineHtml(_) => {
                            return Err(Error::ContainsHtml);
                        }
                        _ => {}
                    }
                }
                Ok(Markdown(markdown))
            }

            inner(markdown.into())
        }

        pub fn new_unchecked(markdown: impl Into<String>) -> Self {
            Self(markdown.into())
        }
    }

    impl Markdown {
        pub const fn as_str(&self) -> &str {
            self.0.as_str()
        }
    }

    impl TryFrom<String> for Markdown {
        type Error = Error;

        fn try_from(value: String) -> Result<Self, Self::Error> {
            Self::parse(value)
        }
    }

    impl From<Markdown> for String {
        fn from(val: Markdown) -> Self {
            val.0
        }
    }

    #[cfg(test)]
    mod test {
        use super::*;

        #[test]
        fn display() {
            let markdown = Markdown::parse("Hello **world**").unwrap();
            assert_eq!(markdown.as_str(), "Hello **world**");
            assert_eq!(markdown.0, "Hello **world**");
        }

        #[test]
        fn parse_invalid() {
            let err =
                Markdown::parse("<script>alert('xss')</script>").unwrap_err();
            assert_eq!(err.to_string(), "Invalid markdown");
        }
    }
}
