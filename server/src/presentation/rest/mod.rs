use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
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
use crate::infra::state::AppState;
use crate::utils::{Pipe, TapMut};

mod artist;
mod correction;
mod enum_table;
mod event;
mod extractor;
mod label;
mod middleware;
mod release;
mod song;
mod state;
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
        .merge(correction::router())
        .merge(event::router())
        .merge(label::router())
        .merge(enum_table::router())
        .merge(release::router())
        .merge(song::router())
        .merge(tag::router())
        .merge(user::router())
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
use data;

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
