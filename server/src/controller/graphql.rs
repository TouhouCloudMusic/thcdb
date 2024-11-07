use axum::{
    extract::State,
    routing::{get, on, MethodFilter},
};
use juniper::EmptySubscription;
use juniper_axum::{extract::JuniperRequest, response::JuniperResponse};
use juniper_axum::{graphiql, playground};

use crate::resolver::juniper::{JuniperMutation, JuniperQuery};
use crate::{service::juniper::*, AppState};

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/graphql",
            on(MethodFilter::GET.or(MethodFilter::POST), graphql_handler),
        )
        .route("/graphiql", get(graphiql("/graphql", "/subscriptions")))
        .route("/playground", get(playground("/graphql", "/subscriptions")))
}

async fn graphql_handler(
    State(state): State<AppState>,
    JuniperRequest(req): JuniperRequest,
) -> JuniperResponse {
    let schema = JuniperSchema::new(
        JuniperQuery,
        JuniperMutation,
        EmptySubscription::new(),
    );
    JuniperResponse(req.execute(&schema, &JuniperContext::from(state)).await)
}
