use std::sync::Arc;

use axum::Router;

use crate::state::AppState;

mod middleware;
mod router;

pub fn create_app(state: AppState) -> Router {
    let app_router = router::router();

    middleware::append_global_middleware_layer(app_router, &state)
        .with_state(Arc::new(state))
}
