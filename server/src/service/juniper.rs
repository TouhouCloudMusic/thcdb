use juniper::EmptySubscription;
use sea_orm::DatabaseConnection;

use crate::resolver::juniper::{JuniperMutation, JuniperQuery};
use crate::service::{ReleaseService, SongService, UserService};
use crate::AppState;

#[derive(Default)]
pub struct JuniperContext {
    #[allow(dead_code)]
    pub database: DatabaseConnection,
    pub user_service: UserService,
    pub song_service: SongService,
    pub release_service: ReleaseService,
}

impl juniper::Context for JuniperContext {}

impl From<AppState> for JuniperContext {
    fn from(state: AppState) -> Self {
        Self {
            database: state.database.clone(),
            user_service: state.user_service,
            song_service: state.song_service,
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
>;
