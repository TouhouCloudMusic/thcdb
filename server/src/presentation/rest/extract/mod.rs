use std::convert::Infallible;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::response::IntoResponse;

mod auth;
pub use auth::CurrentUser;
mod json;

#[trait_variant::make(Send)]
pub trait TryFromRef<T> {
    type Rejection: IntoResponse;

    async fn try_from_ref(input: &T) -> Result<Self, Self::Rejection>
    where
        Self: Sized;
}

impl<T> TryFromRef<T> for T
where
    T: Clone + Send + Sync,
{
    type Rejection = Infallible;

    async fn try_from_ref(input: &T) -> Result<Self, Self::Rejection> {
        Ok(input.clone())
    }
}

pub struct TryState<S>(pub S);

impl<In, Out> FromRequestParts<In> for TryState<Out>
where
    Out: TryFromRef<In>,
    In: Send + Sync,
{
    type Rejection = <Out as TryFromRef<In>>::Rejection;

    async fn from_request_parts(
        _parts: &mut Parts,
        state: &In,
    ) -> Result<Self, Self::Rejection> {
        let inner_state = Out::try_from_ref(state).await?;
        Ok(Self(inner_state))
    }
}
