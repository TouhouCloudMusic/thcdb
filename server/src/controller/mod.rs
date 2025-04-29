mod artist;
mod correction;
mod event;
// mod graphql;
mod enum_table;
mod label;
mod release;
mod song;
mod tag;
mod user;

use std::convert::Infallible;

use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;
use axum::response::IntoResponse;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::domain::user::User;
use crate::{ArcAppState, state};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Touhou Cloud DB",
        description = "TODO",
        license(
            name = "MIT",
            url  = "https://opensource.org/licenses/MIT"
        )
    ),
    // https://github.com/juhaku/utoipa/issues/1165
    components(schemas(
        correction::HandleCorrectionMethod
    ))
)]
struct ApiDoc;

pub fn api_router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(artist::router())
        .merge(correction::router())
        .merge(event::router())
        .merge(label::router())
        .merge(enum_table::router())
        .merge(release::router())
        .merge(song::router())
        .merge(tag::router())
        .merge(user::router())
        .routes(routes!(health_check))
}

#[utoipa::path(
    get,
    path = "/health_check",
    responses(
        (status = 200)
    ),
)]
async fn health_check() -> impl IntoResponse {
    StatusCode::OK
}

macro_rules! data {
    ($($name:ident, $type:ty $(, $as:ident)? $(,)?)*) => {
        $(
            #[derive(utoipa::ToSchema)]
            struct $name {
                status: String,
                data: $type
            }
        ) *
    };
}

use data;

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

struct TryState<S>(pub S);

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

struct CurrentUser(pub User);

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let session = parts
            .extensions
            .get::<state::AuthSession>()
            .cloned()
            .ok_or_else(|| {
                tracing::error!("Failed to extract AuthSession from state");
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        session
            .user
            .map_or(Err(StatusCode::UNAUTHORIZED), |user| Ok(Self(user)))
    }
}
