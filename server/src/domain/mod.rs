pub mod artist;
pub mod artist_image_queue;
pub mod auth;
pub mod correction;
pub mod event;
pub mod image;
pub mod image_queue;
pub mod label;
pub mod markdown;
pub mod model;
pub mod release;
pub mod shared;
pub mod song;
pub mod song_lyrics;
pub mod tag;
pub mod user;
pub use shared::*;
pub mod artist_release;
pub mod credit_role;
pub mod release_image;
pub mod release_image_queue;
pub mod error {
    use std::fmt::Write;

    use snafu::Snafu;

    #[derive(Debug, Snafu)]
    #[snafu(whatever)]
    #[snafu(display("{}", self.display()))]
    pub struct InfraWhatever {
        #[snafu(source(from(Box<dyn std::error::Error + Send + Sync>, Some)))]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
        message: String,
    }

    impl InfraWhatever {
        fn display(&self) -> String {
            let mut buf = String::with_capacity(64);

            buf.push_str(&self.message);

            if let Some(source) = &self.source {
                buf.push('\n');
                write!(&mut buf, "Cause: {source}").unwrap();
            }

            buf
        }
    }

    impl From<String> for InfraWhatever {
        fn from(message: String) -> Self {
            Self {
                source: None,
                message,
            }
        }
    }
}
