pub mod model;
pub mod repository;

pub mod query_kind {
    pub struct Ref;
    pub struct Summary;
    pub struct Full;
}

pub use error::ValidationError;
mod error {
    use axum::http::StatusCode;
    use macros::ApiError;
    use snafu::Snafu;

    #[derive(Debug, Snafu, ApiError)]
    #[snafu(display("Validation error: {source}"))]
    #[api_error(status_code = StatusCode::BAD_REQUEST)]
    pub struct ValidationError<T>
    where
        T: std::error::Error + 'static,
    {
        pub source: T,
    }

    impl<T> From<T> for ValidationError<T>
    where
        T: std::error::Error + 'static,
    {
        fn from(source: T) -> Self {
            Self { source }
        }
    }
}
