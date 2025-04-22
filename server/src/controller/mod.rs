use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;

use crate::ArcAppState;

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
