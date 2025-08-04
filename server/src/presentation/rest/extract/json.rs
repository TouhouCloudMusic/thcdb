use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{FromRequest, Request};
use bytes::Bytes;
use serde::de::DeserializeOwned;

pub struct MaybeJson<T>(pub Option<T>);

impl<T, S> FromRequest<S> for MaybeJson<T>
where
    S: Send + Sync,
    T: DeserializeOwned,
{
    type Rejection = JsonRejection;

    async fn from_request(
        req: Request,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let bytes = Bytes::from_request(req, state).await?;

        if bytes.is_empty() {
            return Ok(Self(None));
        }

        Json::from_bytes(&bytes).map(|Json(v)| Self(Some(v)))
    }
}
