use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Clone, Copy, Deserialize, Serialize, IntoParams, ToSchema)]
#[into_params(parameter_in = Query)]
pub(crate) struct SubscriptionStatus {
    pub(crate) subscribed: bool,
}
