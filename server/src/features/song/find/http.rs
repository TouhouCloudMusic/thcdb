use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PaginationQuery, SongFilter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::Paginated;
use crate::features::song::model::Song;
use crate::infra::error::Error;

const TAG: &str = "Song";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_song_by_id))
                .routes(routes!(find_song_by_keyword))
                .routes(routes!(explore_song))
        })
        .finish()
}

data! {
    DataOptionSong, Option<Song>
    DataVecSong, Vec<Song>
    DataPaginatedSong, Paginated<Song>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song/{id}",
    responses(
        (status = 200, body = DataOptionSong),
    ),
)]
async fn find_song_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Song>>, Error> {
    super::repo::find_by_id(&repo, id)
        .await
        .map(Into::into)
        .map_err(Into::into)
}

#[derive(Deserialize, ToSchema, IntoParams)]
struct KwQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song",
    params(KwQuery),
    responses(
        (status = 200, body = DataVecSong),
    ),
)]
async fn find_song_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<Song>>, Error> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .map(Into::into)
        .map_err(Into::into)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song/explore",
    params(SongFilter, PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedSong),
        Error
    ),
)]
async fn explore_song(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<SongFilter>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<Paginated<Song>>, Error> {
    let normalized = filter.with_sort_defaults();
    tracing::info!(?normalized, "explore_song: incoming query");
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Into::into)
        .map_err(Into::into)
}
