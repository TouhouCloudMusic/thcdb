use entity::GqlScalarValue;
use juniper::EmptySubscription;
use sea_orm::DatabaseConnection;

use crate::resolver::juniper::{JuniperMutation, JuniperQuery};
use crate::{service, AppState};

#[derive(Default)]
pub struct JuniperContext {
    #[allow(dead_code)]
    pub database: DatabaseConnection,
    pub user_service: service::User,
    pub release_service: service::Release,
}

impl juniper::Context for JuniperContext {}

impl From<AppState> for JuniperContext {
    fn from(state: AppState) -> Self {
        Self {
            database: state.database.clone(),
            user_service: state.user_service,
            release_service: state.release_service,
        }
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
