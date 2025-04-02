use axum::Router;

use crate::state::ArcAppState;

mod middleware;
mod router;

pub fn create_app(state: ArcAppState) -> Router {
    let app_router = router::router();

    middleware::append_global_middleware_layer(app_router, &state)
        .with_state(state)
}
