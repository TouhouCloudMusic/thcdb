use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::domain::song::Song;
use crate::infra::error::Error;

const TAG: &str = "Song";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(find_song_by_id))
        .routes(routes!(find_song_by_keyword))
}

data! {
    DataOptionSong, Option<Song>
    DataVecSong, Vec<Song>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song/{id}",
    responses(
        (status = 200, body = DataOptionSong),
        Error
    ),
)]
async fn find_song_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Song>>, Error> {
    super::repo::find_by_id(&repo, id).await.bimap_into()
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
        Error
    ),
)]
async fn find_song_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<Song>>, Error> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .bimap_into()
}
