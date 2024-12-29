use axum::extract::State;
use axum::routing::{get, on, MethodFilter};
use entity::GqlScalarValue;
use juniper::EmptySubscription;
use juniper_axum::extract::JuniperRequest;
use juniper_axum::response::JuniperResponse;
use juniper_axum::{graphiql, playground};

use crate::resolver::juniper::{JuniperMutation, JuniperQuery};
use crate::service::juniper::{JuniperContext, JuniperSchema};
use crate::AppState;

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
    JuniperRequest(req): JuniperRequest<GqlScalarValue>,
) -> JuniperResponse<GqlScalarValue> {
    let schema = JuniperSchema::new_with_scalar_value(
        JuniperQuery,
        JuniperMutation,
        EmptySubscription::new(),
    );
    JuniperResponse::<GqlScalarValue>(
        req.execute(&schema, &JuniperContext::from(state)).await,
    )
}
