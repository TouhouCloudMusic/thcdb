#![expect(clippy::needless_for_each)]
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use flow::{Pipe, TapMut};
use headers::authorization::{Basic, Credentials};
use maud::{DOCTYPE, html};
use middleware::append_global_middlewares;
use state::{ArcAppState, AuthSession};
use tokio::net::TcpListener;
use tokio::signal;
use tower_http::services::ServeDir;
use utoipa::{OpenApi, PartialSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_scalar::{Scalar, Servable};

use crate::constant::r#gen::{KT_CONSTANTS, TS_CONSTANTS};
use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::feature;
use crate::feature::artist::find::CommonFilter as ArtistCommonFilter;
use crate::infra::state::AppState;
use crate::shared::http::{CorrectionSortField, SortDirection};
use crate::utils::openapi::ContentType;

pub mod api_response;
mod artist;
mod correction;
mod credit_role;
mod error;
mod event;
mod extract;
mod label;
mod middleware;
mod release;
mod song;
mod song_lyrics;
pub mod state;
mod tag;
mod user;
pub use extract::CurrentUser;

#[expect(unused_imports, reason = "re-exported for macro use")]
pub use self::error::ApiError;

struct DefaultErrorResponseModifier;

impl DefaultErrorResponseModifier {
    const DEFAULT_KEY: &'static str = "default";
    const TOO_MANY_REQUESTS_KEY: &'static str = "429";

    fn fallback_response() -> utoipa::openapi::Response {
        let mut response = api_response::Error::response_def();
        Self::ensure_text(&mut response);
        response
    }

    fn too_many_requests_response() -> utoipa::openapi::Response {
        let mut response = utoipa::openapi::ResponseBuilder::new()
            .description(
                StatusCode::TOO_MANY_REQUESTS
                    .canonical_reason()
                    .unwrap_or("Too Many Requests"),
            )
            .build();
        Self::ensure_text(&mut response);
        response
    }

    fn ensure_default(responses: &mut utoipa::openapi::response::Responses) {
        match responses.responses.entry(Self::DEFAULT_KEY.to_string()) {
            std::collections::btree_map::Entry::Vacant(entry) => {
                entry.insert(utoipa::openapi::RefOr::T(
                    Self::fallback_response(),
                ));
            }
            std::collections::btree_map::Entry::Occupied(mut entry) => {
                match entry.get_mut() {
                    utoipa::openapi::RefOr::T(response) => {
                        Self::ensure_json(response);
                        Self::ensure_text(response);
                    }
                    utoipa::openapi::RefOr::Ref(_) => {
                        entry.insert(utoipa::openapi::RefOr::T(
                            Self::fallback_response(),
                        ));
                    }
                }
            }
        }
    }

    fn ensure_too_many_requests(
        responses: &mut utoipa::openapi::response::Responses,
    ) {
        match responses
            .responses
            .entry(Self::TOO_MANY_REQUESTS_KEY.to_string())
        {
            std::collections::btree_map::Entry::Vacant(entry) => {
                entry.insert(utoipa::openapi::RefOr::T(
                    Self::too_many_requests_response(),
                ));
            }
            std::collections::btree_map::Entry::Occupied(mut entry) => {
                match entry.get_mut() {
                    utoipa::openapi::RefOr::T(response) => {
                        Self::ensure_text(response);
                    }
                    utoipa::openapi::RefOr::Ref(_) => {
                        entry.insert(utoipa::openapi::RefOr::T(
                            Self::too_many_requests_response(),
                        ));
                    }
                }
            }
        }
    }

    fn ensure_json(response: &mut utoipa::openapi::Response) {
        let key = ContentType::Json.into();
        if response.content.contains_key(&key) {
            return;
        }

        if let Some(content) = api_response::Error::response_def()
            .content
            .get(&key)
            .cloned()
        {
            response.content.insert(key, content);
        }
    }

    fn ensure_text(response: &mut utoipa::openapi::Response) {
        let key = ContentType::Text.into();
        response.content.entry(key).or_insert_with(|| {
            utoipa::openapi::ContentBuilder::new()
                .schema(String::schema().into())
                .build()
        });
    }
}

impl utoipa::Modify for DefaultErrorResponseModifier {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        for path_item in openapi.paths.paths.values_mut() {
            let operations = [
                &mut path_item.get,
                &mut path_item.put,
                &mut path_item.post,
                &mut path_item.delete,
                &mut path_item.options,
                &mut path_item.head,
                &mut path_item.patch,
                &mut path_item.trace,
            ];

            for operation in operations.into_iter().flatten() {
                let responses = &mut operation.responses;

                Self::ensure_default(responses);
                Self::ensure_too_many_requests(responses);
            }
        }
    }
}

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
        feature::correction::HandleCorrectionMethod,
        ArtistCommonFilter,
        CorrectionSortField,
        SortDirection,
        api_response::Error,
    )),
    modifiers(&DefaultErrorResponseModifier)
)]
struct ApiDoc;

fn basic_security_requirement() -> utoipa::openapi::security::SecurityRequirement
{
    utoipa::openapi::security::SecurityRequirement::new(
        Basic::SCHEME,
        Vec::<String>::new(),
    )
}

#[derive(OpenApi)]
#[openapi(modifiers(&BasicSecurityModifier))]
pub struct PrivateDoc;

pub struct BasicSecurityModifier;

impl utoipa::Modify for BasicSecurityModifier {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi
            .components
            .get_or_insert_with(utoipa::openapi::Components::new);

        if !components.security_schemes.contains_key(Basic::SCHEME) {
            components.add_security_scheme(
                Basic::SCHEME,
                utoipa::openapi::security::SecurityScheme::Http(
                    utoipa::openapi::security::HttpBuilder::new()
                        .scheme(
                            utoipa::openapi::security::HttpAuthScheme::Basic,
                        )
                        .build(),
                ),
            );
        }

        for path_item in openapi.paths.paths.values_mut() {
            let operations = [
                &mut path_item.get,
                &mut path_item.put,
                &mut path_item.post,
                &mut path_item.delete,
                &mut path_item.options,
                &mut path_item.head,
                &mut path_item.patch,
                &mut path_item.trace,
            ];

            for operation in operations.into_iter().flatten() {
                let requirement = basic_security_requirement();

                match operation.security.as_mut() {
                    Some(requirements) => {
                        if !requirements
                            .iter()
                            .any(|existing| existing == &requirement)
                        {
                            requirements.push(requirement);
                        }
                    }
                    None => {
                        operation.security = Some(vec![requirement]);
                    }
                }
            }
        }
    }
}

pub struct AppRouter<S>
where
    S: Clone + Send + Sync + 'static,
{
    public: OpenApiRouter<S>,
    private: OpenApiRouter<S>,
}

impl<S> AppRouter<S>
where
    S: Clone + Send + Sync + 'static,
{
    pub fn new() -> Self {
        Self {
            public: OpenApiRouter::new(),
            private: OpenApiRouter::with_openapi(PrivateDoc::openapi()),
        }
    }

    pub fn with_public<F>(mut self, f: F) -> Self
    where
        F: FnOnce(OpenApiRouter<S>) -> OpenApiRouter<S>,
    {
        self.public = f(self.public);
        self
    }

    pub fn with_private<F>(mut self, f: F) -> Self
    where
        F: FnOnce(OpenApiRouter<S>) -> OpenApiRouter<S>,
    {
        self.private = f(self.private);
        self
    }

    pub fn finish(mut self) -> OpenApiRouter<S> {
        utoipa::Modify::modify(
            &BasicSecurityModifier,
            self.private.get_openapi_mut(),
        );
        OpenApiRouter::new().merge(self.public).merge(self.private)
    }
}

pub async fn listen(
    listener: TcpListener,
    state: Arc<AppState>,
) -> Result<(), Box<dyn std::error::Error>> {
    let state = ArcAppState::new(state);

    let app = router(state);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async {
        match signal::ctrl_c().await {
            Ok(()) => {}
            Err(err) => {
                eprintln!("Unable to listen for shutdown signal: {err}");
            }
        }
    })
    .await?;

    Ok(())
}

fn router(state: ArcAppState) -> Router {
    let api_router = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(feature::router())
        .routes(routes!(health_check));

    let (router, mut api_doc) = api_router.split_for_parts();

    utoipa::Modify::modify(&DefaultErrorResponseModifier, &mut api_doc);

    let doc_router = router
        .merge(Scalar::with_url("/docs", api_doc.clone()))
        .route("/openapi.json", get(async move || Json(api_doc)));

    Router::new()
        .route("/", get(home_page))
        .merge(doc_router)
        .merge(static_dir())
        .merge(constant_files())
        .pipe(|this| append_global_middlewares(this, &state))
        .with_state(state)
}

async fn home_page(session: AuthSession) -> impl IntoResponse {
    let hello_msg =
        String::from("Welcome to touhou cloud music").tap_mut(|s| {
            if let Some(user) = session.user {
                *s = format!("{s}, {}", user.name);
            }
        });

    html! {
        (DOCTYPE)
        html {
            head { title { "Touhou Cloud Db" }}
            body {
                h1 { (hello_msg) }
                p {
                    "Our website is not yet complete, you can visit " a href="/docs" {
                        "docs"
                    } " for the API reference"
                }
            }
        }
    }
}

fn static_dir() -> Router<ArcAppState> {
    let image_path = PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]);

    Router::new().nest_service(
        &format!("/{}", image_path.to_string_lossy()),
        ServeDir::new(&image_path),
    )
}

fn constant_files<S: Clone + Send + Sync + 'static>() -> Router<S> {
    Router::<S>::new()
        .route("/constant.ts", get(async || TS_CONSTANTS.clone()))
        .route("/constant.kt", get(async || KT_CONSTANTS.clone()))
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
            #[allow(clippy::allow_attributes,dead_code)]
            struct $name {
                status: String,
                #[schema(
                    required = true,
                )]
                data: $type
            }
        ) *
	};
}
pub(crate) use data;

#[cfg(test)]
mod test {
    use std::path::PathBuf;

    use utoipa::Modify;
    use utoipa::openapi::RefOr;

    use crate::constant::{IMAGE_DIR, PUBLIC_DIR};

    #[test]
    fn static_path() {
        let image_path = PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]);
        let gen_path = format!("/{}", image_path.to_string_lossy());

        assert_eq!(gen_path, "/public/image");
    }

    #[test]
    fn default_fallback_added() {
        use utoipa::openapi::OpenApiBuilder;
        use utoipa::openapi::path::{
            HttpMethod, OperationBuilder, PathItemBuilder, PathsBuilder,
        };
        use utoipa::openapi::response::ResponseBuilder;

        let operation = OperationBuilder::new()
            .response("200", ResponseBuilder::new().build())
            .response("401", ResponseBuilder::new().build())
            .build();

        let path_item = PathItemBuilder::new()
            .operation(HttpMethod::Post, operation)
            .build();
        let paths = PathsBuilder::new().path("/demo", path_item).build();

        let mut doc = OpenApiBuilder::new().paths(paths).build();

        Modify::modify(&super::DefaultErrorResponseModifier, &mut doc);

        let operation = doc
            .paths
            .paths
            .get("/demo")
            .and_then(|item| item.post.as_ref())
            .expect("operation present");

        let responses = &operation.responses.responses;

        let default = responses
            .get("default")
            .expect("default response is inserted");
        if let RefOr::T(response) = default {
            assert!(response.content.contains_key("application/json"));
            assert!(response.content.contains_key("text/plain"));
        } else {
            panic!("default response should be inline");
        }

        let too_many_requests =
            responses.get("429").expect("429 response is inserted");
        if let RefOr::T(response) = too_many_requests {
            assert!(response.content.contains_key("text/plain"));
        } else {
            panic!("429 response should be inline");
        }
    }
}
