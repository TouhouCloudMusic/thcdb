use std::path::PathBuf;

use axum::routing::get;
use axum::{Json, Router};
use maud::{DOCTYPE, html};
use tower_http::services::ServeDir;
use utoipa_scalar::{Scalar, Servable};

use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::controller;
use crate::state::{ArcAppState, AuthSession};
use crate::utils::TapMut;

pub fn router() -> Router<ArcAppState> {
    let (api_router, api_doc) = controller::api_router().split_for_parts();

    let doc_router = api_router
        .merge(Scalar::with_url("/docs", api_doc.clone()))
        .route("/openapi.json", get(async move || Json(api_doc)));

    Router::new()
        .route(
            "/",
            get(|session: AuthSession| async {
                let hello_msg = String::from("Welcome to touhou cloud music").tap_mut(|s|{
                    if let Some(user) = session.user {
                       *s = format!("{s}, {}",user.name);
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
            }),
        )
        .merge(doc_router)
        .merge(static_dir())
}

fn static_dir() -> Router<ArcAppState> {
    let image_path = PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]);

    Router::new().nest_service(
        &format!("/{}", image_path.to_string_lossy()),
        ServeDir::new(&image_path),
    )
}

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
