use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;

use crate::AppState;

mod artist;
mod graphql;
mod release;
mod user;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "Touhou Cloud Db", description = "TODO")
    )
)]
struct ApiDoc;

pub fn api_router() -> OpenApiRouter<AppState> {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(user::router())
        .merge(artist::router())
        .merge(release::router())
}
