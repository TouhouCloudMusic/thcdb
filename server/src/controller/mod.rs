use crate::AppState;
use axum::Router;

mod graphql;
mod user;

pub fn api_router() -> Router<AppState> {
    Router::new().merge(graphql::router()).merge(user::router())
}
