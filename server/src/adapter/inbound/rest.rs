#![expect(clippy::needless_for_each)]
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use flow::{Pipe, TapMut};
use maud::{DOCTYPE, html};
use middleware::append_global_middlewares;
use state::{ArcAppState, AuthSession};
use tokio::net::TcpListener;
use tokio::signal;
use tower_http::services::ServeDir;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_scalar::{Scalar, Servable};

use crate::constant::r#gen::{KT_CONSTANTS, TS_CONSTANTS};
use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::feature;
use crate::feature::artist::find::repo::CommonFilter as ArtistCommonFilter;
use crate::infra::state::AppState;

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
pub use error::ApiError;
pub use extract::CurrentUser;

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
        correction::HandleCorrectionMethod,
        ArtistCommonFilter,
    ))
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
        .merge(artist::router())
        .merge(feature::router())
        .merge(correction::router())
        .merge(event::router())
        .merge(label::router())
        .merge(release::router())
        .merge(song::router())
        .merge(song_lyrics::router())
        .merge(tag::router())
        .merge(user::router())
        .merge(credit_role::router())
        .routes(routes!(health_check));

    let (router, api_doc) = api_router.split_for_parts();

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

    use crate::constant::{IMAGE_DIR, PUBLIC_DIR};

    #[test]
    fn static_path() {
        let image_path = PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]);
        let gen_path = format!("/{}", image_path.to_string_lossy());

        assert_eq!(gen_path, "/public/image");
    }
}
