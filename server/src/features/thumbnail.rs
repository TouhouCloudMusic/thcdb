use std::future::Future;
use std::io::Cursor;
use std::path::{Component, Path};
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Path as AxumPath, Query, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum_extra::typed_header::TypedHeader;
use bytes::Bytes;
use futures_util::Stream;
use headers::{ETag, HeaderMapExt, IfNoneMatch};
use image::ImageFormat;
use infra_error::ContextError;
use moka::future::Cache;
use serde::Deserialize;
use serde_repr::Deserialize_repr;
use tokio::io::AsyncReadExt;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;

const THUMBNAIL_CACHE_CAPACITY: u64 = 128 * 1024 * 1024; // 128 MiB
const THUMBNAIL_VERSION: u8 = 1;

#[derive(
    Clone, Copy, Debug, Deserialize_repr, Hash, PartialEq, Eq, ToSchema,
)]
#[repr(u8)]
pub(crate) enum ThumbnailSize {
    Px64 = 6,
    Px128 = 7,
    Px256 = 8,
    Px512 = 9,
    Px1024 = 10,
    Px2048 = 11,
}

impl ThumbnailSize {
    const fn as_pixels(self) -> u32 {
        1 << (self as u8)
    }
}

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub(crate) struct ImageQuery {
    /// The maximum edge is 2^size pixels.
    size: Option<ThumbnailSize>,
    v: Option<u8>,
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Path)]
struct ImagePath {
    object_key: String,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
struct ImageObjectKey(String);

impl ImageObjectKey {
    fn parse(value: String) -> Option<Self> {
        let path = Path::new(&value);
        if path.as_os_str().is_empty()
            || !path
                .components()
                .all(|component| matches!(component, Component::Normal(_)))
        {
            return None;
        }

        Some(Self(value))
    }

    fn as_str(&self) -> &str {
        &self.0
    }
}

impl AsRef<Path> for ImageObjectKey {
    fn as_ref(&self) -> &Path {
        Path::new(&self.0)
    }
}

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
struct ThumbnailKey {
    object_key: ImageObjectKey,
    size: ThumbnailSize,
    version: u8,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
enum ThumbnailError {
    #[display("Image not found")]
    SourceNotFound,
    #[display("{_0}")]
    Internal(#[error(source)] ContextError),
}

impl From<std::io::Error> for ThumbnailError {
    fn from(error: std::io::Error) -> Self {
        if error.kind() == std::io::ErrorKind::NotFound {
            Self::SourceNotFound
        } else {
            Self::Internal(ContextError::new("read thumbnail source", error))
        }
    }
}

impl From<image::ImageError> for ThumbnailError {
    fn from(error: image::ImageError) -> Self {
        Self::Internal(ContextError::new(
            "transform image into thumbnail",
            error,
        ))
    }
}

impl From<tokio::task::JoinError> for ThumbnailError {
    fn from(error: tokio::task::JoinError) -> Self {
        Self::Internal(ContextError::new("run thumbnail worker", error))
    }
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub(crate) enum Error {
    #[display("Unsupported image version")]
    UnsupportedVersion,
    #[display("Image not found")]
    NotFound,
    #[display("{_0}")]
    Internal(#[error(source)] InternalError),
}

impl From<std::io::Error> for Error {
    fn from(error: std::io::Error) -> Self {
        if error.kind() == std::io::ErrorKind::NotFound {
            Self::NotFound
        } else {
            Self::Internal(InternalError::new(error))
        }
    }
}

impl From<Arc<ThumbnailError>> for Error {
    fn from(error: Arc<ThumbnailError>) -> Self {
        if matches!(error.as_ref(), ThumbnailError::SourceNotFound) {
            Self::NotFound
        } else {
            Self::Internal(InternalError::new(error))
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::UnsupportedVersion => {
                AppError::bad_request("Unsupported image version")
                    .into_response()
            }
            Self::NotFound => {
                AppError::not_found("Image not found").into_response()
            }
            Self::Internal(source) => source.into_response(),
        }
    }
}

#[derive(Clone)]
pub(crate) struct ThumbnailCache(Cache<ThumbnailKey, Bytes>);

impl Default for ThumbnailCache {
    fn default() -> Self {
        Self(
            Cache::builder()
                .max_capacity(THUMBNAIL_CACHE_CAPACITY)
                .weigher(|_key: &ThumbnailKey, value: &Bytes| {
                    u32::try_from(value.len()).unwrap_or(u32::MAX)
                })
                .build(),
        )
    }
}

impl ThumbnailCache {
    async fn get_or_create<E>(
        &self,
        key: ThumbnailKey,
        init: impl Future<Output = Result<Bytes, E>>,
    ) -> Result<Bytes, Arc<E>>
    where
        E: Send + Sync + 'static,
    {
        self.0.try_get_with(key, init).await
    }
}

pub(crate) fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new().route("/public/image/{*object_key}", get(get_image))
}

#[utoipa::path(
    get,
    path = "/public/image/{object_key}",
    tag = "Image",
    params(ImagePath, ImageQuery),
    responses(
        (status = 200, description = "Original image or WebP thumbnail"),
        (status = 304, description = "Image has not changed"),
        (status = 400, description = "Invalid size or image version"),
        (status = 404, description = "Image not found"),
    ),
)]
pub(crate) async fn get_image(
    State(state): State<ArcAppState>,
    AxumPath(object_key): AxumPath<String>,
    Query(query): Query<ImageQuery>,
    if_none_match: Option<TypedHeader<IfNoneMatch>>,
) -> Result<ImageResponse, Error> {
    if query.v.is_some_and(|version| version != THUMBNAIL_VERSION) {
        return Err(Error::UnsupportedVersion);
    }

    let object_key =
        ImageObjectKey::parse(object_key).ok_or(Error::NotFound)?;
    let if_none_match = if_none_match.map(|TypedHeader(value)| value);

    if let Some(size) = query.size {
        let storage = state.image_storage.clone();
        let source_key = object_key.clone();
        let bytes = state
            .thumbnail_cache
            .get_or_create(
                ThumbnailKey {
                    object_key,
                    size,
                    version: THUMBNAIL_VERSION,
                },
                async move {
                    let source = storage
                        .read(source_key)
                        .await
                        .map_err(ThumbnailError::from)?;
                    tokio::task::spawn_blocking(move || {
                        create_thumbnail(&source, size.as_pixels())
                    })
                    .await
                    .map_err(ThumbnailError::from)?
                    .map_err(ThumbnailError::from)
                },
            )
            .await?;

        let etag = strong_etag(blake3::hash(&bytes).to_hex())?;

        return Ok(ImageResponse {
            body: Body::from(bytes),
            etag,
            content_type: "image/webp",
            if_none_match,
        });
    }

    let file = state.image_storage.open(&object_key).await?;

    let etag = strong_etag(object_key.as_str())?;

    let content_type = ImageFormat::from_path(object_key.as_ref())
        .map_or("application/octet-stream", |format| format.to_mime_type());

    Ok(ImageResponse {
        body: Body::from_stream(stream_file(file)),
        etag,
        content_type,
        if_none_match,
    })
}

fn strong_etag(value: impl std::fmt::Display) -> Result<ETag, Error> {
    format!("\"{value}\"")
        .parse()
        .map_err(|source| Error::Internal(InternalError::new(source)))
}

pub(crate) struct ImageResponse {
    body: Body,
    etag: ETag,
    content_type: &'static str,
    if_none_match: Option<IfNoneMatch>,
}

impl IntoResponse for ImageResponse {
    fn into_response(self) -> Response {
        const CACHE_CONTROL_VALUE: &str = "public, max-age=31536000, immutable";

        let not_modified = self.if_none_match.is_some_and(|condition| {
            !condition.precondition_passes(&self.etag)
        });

        let mut response = if not_modified {
            let mut response = Response::new(Body::empty());
            *response.status_mut() = StatusCode::NOT_MODIFIED;
            response
        } else {
            let mut response = Response::new(self.body);
            response.headers_mut().insert(
                CONTENT_TYPE,
                HeaderValue::from_static(self.content_type),
            );
            response
        };

        response.headers_mut().insert(
            CACHE_CONTROL,
            HeaderValue::from_static(CACHE_CONTROL_VALUE),
        );
        response.headers_mut().typed_insert(self.etag);

        response
    }
}

fn stream_file(
    mut file: tokio::fs::File,
) -> impl Stream<Item = std::io::Result<Bytes>> + Send + 'static {
    async_stream::try_stream! {
        let mut buffer = vec![0; 64 * 1024];
        loop {
            let bytes_read = file.read(&mut buffer).await?;
            if bytes_read == 0 {
                break;
            }
            yield Bytes::copy_from_slice(&buffer[..bytes_read]);
        }
    }
}

fn create_thumbnail(
    source: &[u8],
    max_edge_pixels: u32,
) -> Result<Bytes, image::ImageError> {
    let image = image::load_from_memory(source)?;
    let image = image.thumbnail(max_edge_pixels, max_edge_pixels);
    let mut output = Cursor::new(Vec::new());
    image.write_to(&mut output, ImageFormat::WebP)?;

    Ok(Bytes::from(output.into_inner()))
}
