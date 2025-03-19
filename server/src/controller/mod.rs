use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;

use crate::AppState;

mod artist;
mod correction;
mod event;
mod graphql;
mod label;
mod lookup_table;
mod release;
mod song;
mod tag;
mod user;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "Touhou Cloud Db", description = "TODO")
    ),
    info(
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

pub fn api_router() -> OpenApiRouter<AppState> {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(artist::router())
        .merge(correction::router())
        .merge(event::router())
        .merge(label::router())
        .merge(lookup_table::router())
        .merge(release::router())
        .merge(song::router())
        .merge(tag::router())
        .merge(user::router())
}
