use crate::AppState;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;

mod graphql;
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
        // .merge(SwaggerUi::new("/").url("/api-doc/openapi.json", None))
        // .merge(graphql::router())
        .merge(user::router())
}
