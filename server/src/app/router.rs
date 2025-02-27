use std::path::PathBuf;

use axum::routing::get;
use axum::{Json, Router};
use tower_http::services::ServeDir;
use utoipa_scalar::{Scalar, Servable};

use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::controller;
use crate::service::user::AuthSession;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    let (api_router, api_doc) = controller::api_router().split_for_parts();

    let doc_router = api_router
        .merge(Scalar::with_url("/docs", api_doc.clone()))
        .route(
            "/openapi.json",
            get(async move || Json(api_doc.to_json().unwrap())),
        );

    Router::new()
        .route(
            "/",
            get(|session: AuthSession| async {
                format!("Hello, {}!", {
                    match session.user {
                        Some(user) => user.name,
                        _ => "world".to_string(),
                    }
                })
            }),
        )
        .merge(doc_router)
        .merge(static_dir())
}

fn static_dir() -> Router<AppState> {
    let image_path = PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]);

    Router::new().nest_service(
        &format!("/{}", image_path.to_string_lossy()),
        ServeDir::new(&image_path),
    )
}
