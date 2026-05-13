use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PageQuery, SongFilter};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::shared::PageResponse;
use crate::features::song::model::Song;
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::{AppError, Data, Error as ApiError};

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
    DataPageSong, PageResponse<Song>
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
) -> Result<Data<Option<Song>>, AppError> {
    super::repo::find_by_id(&repo, id)
        .await
        .with_operation("find song by id")
        .map(Data::from)
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
) -> Result<Data<Vec<Song>>, AppError> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .with_operation("find songs by keyword")
        .map(Data::from)
        .map_err(Into::into)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song/explore",
    params(SongFilter, PageQuery),
    responses(
        (status = 200, body = DataPageSong),
        ApiError
    ),
)]
async fn explore_song(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<SongFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<Song>>, AppError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.song.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .with_operation("explore songs")
        .map(Data::from)
        .map_err(Into::into)
}
