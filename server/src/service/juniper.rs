use entity::GqlScalarValue;
use juniper::EmptySubscription;

use crate::resolver::juniper::{JuniperMutation, JuniperQuery};
use crate::AppState;

pub struct JuniperContext {
    pub state: AppState,
}

impl juniper::Context for JuniperContext {}

impl From<AppState> for JuniperContext {
    fn from(app_state: AppState) -> Self {
        Self { state: app_state }
    }
}

pub struct _JuniperSubscription;

pub type JuniperSchema = juniper::RootNode<
    'static,
    JuniperQuery,
    JuniperMutation,
    EmptySubscription<JuniperContext>,
    GqlScalarValue,
>;
