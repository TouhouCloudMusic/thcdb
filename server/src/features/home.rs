use axum::extract::State;
use entity::{artist, release, song, tag};
use sea_orm::{EntityTrait, PaginatorTrait};
use serde::Serialize;
use tokio::try_join;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::{AppError, Data};

#[derive(Serialize, ToSchema)]
#[expect(clippy::struct_field_names)]
pub struct HomeMetadata {
    pub artists_count: u64,
    pub releases_count: u64,
    pub songs_count: u64,
    pub tags_count: u64,
}

data! {
    DataHomeMetadata, HomeMetadata
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(home_metadata)))
        .finish()
}

#[utoipa::path(
    get,
    path = "/home/metadata",
    responses(
        (status = 200, body = DataHomeMetadata),
    ),
)]
async fn home_metadata(
    State(state): State<ArcAppState>,
) -> Result<Data<HomeMetadata>, AppError> {
    let db = &state.database;
    let (artists_count, releases_count, songs_count, tags_count) = try_join!(
        artist::Entity::find().count(db),
        release::Entity::find().count(db),
        song::Entity::find().count(db),
        tag::Entity::find().count(db),
    )
    .db_operation("load home metadata")?;

    Ok(HomeMetadata {
        artists_count,
        releases_count,
        songs_count,
        tags_count,
    }
    .into())
}
