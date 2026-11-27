use axum::extract::{Path, Query, State};
use domain::shared::PageResponse;
use serde::Deserialize;
use song_repo::list::SongListing;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PageQuery, SongFilter, detail, explore};
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::song::model::{Song, SongDetail};
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::{AppError, Data, Error as ApiError};

impl From<detail::DetailError> for AppError {
    fn from(error: detail::DetailError) -> Self {
        match error {
            detail::DetailError::Database(source) => source.into(),
            detail::DetailError::Rating(source) => source.into(),
        }
    }
}

const TAG: &str = "Song";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_song_by_id))
                .routes(routes!(find_song_pending_correction))
                .routes(routes!(find_song_by_keyword))
                .routes(routes!(explore_song))
        })
        .finish()
}

data! {
    DataOptionSong, Option<Song>
    DataOptionSongDetail, Option<SongDetail>
    DataVecSong, Vec<Song>
    DataPageSong, PageResponse<SongListing>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song/{id}",
    responses(
        (status = 200, body = DataOptionSongDetail),
    ),
)]
async fn find_song_by_id(
    session: AuthSession,
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<SongDetail>>, AppError> {
    let detail = detail::find_detail(
        &repo,
        id,
        session.user.as_ref().map(|user| user.id),
    )
    .await?;

    Ok(Data::from(detail))
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/song/{id}/correction/{correction_id}",
    params(
        ("id" = i32, Path, description = "Song id"),
        ("correction_id" = i32, Path, description = "Pending correction id"),
    ),
    responses((status = 200, body = DataOptionSong)),
)]
async fn find_song_pending_correction(
    State(repo): State<state::SeaOrmRepository>,
    Path((id, correction_id)): Path<(i32, i32)>,
) -> Result<Data<Option<Song>>, DatabaseError> {
    detail::find_pending_correction(&repo, id, correction_id)
        .await
        .map(Data::from)
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
) -> Result<Data<Vec<Song>>, DatabaseError> {
    detail::find_by_keyword(&repo, &query.keyword)
        .await
        .map(Data::from)
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
) -> Result<Data<PageResponse<SongListing>>, DatabaseError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.song.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    explore::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Data::from)
}
