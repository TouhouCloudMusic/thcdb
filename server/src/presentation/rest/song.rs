use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::{self, ArcAppState};
use crate::api_response::{Data, Message};
use crate::application::correction::NewCorrectionDto;
use crate::application::song::{CreateError, UpsertCorrectionError};
use crate::domain::song::model::{NewSong, Song};
use crate::error::InfraError;
use crate::utils::MapInto;

const TAG: &str = "Song";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_song))
        .routes(routes!(update_song))
        .routes(routes!(find_song_by_id))
        .routes(routes!(find_song_by_keyword))
}

super::data! {
    DataOptionSong, Option<Song>
    DataVecSong, Vec<Song>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song/{id}",
    responses(
		(status = 200, body = DataOptionSong),
		InfraError
    ),
)]
async fn find_song_by_id(
    State(service): State<state::SongService>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Song>>, InfraError> {
    service.find_by_id(id).await.map_into()
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
		InfraError
    ),
)]
async fn find_song_by_keyword(
    State(service): State<state::SongService>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<Song>>, InfraError> {
    service.find_by_keyword(&query.keyword).await.map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song",
    request_body = NewCorrectionDto<NewSong>,
    responses(
		(status = 200, body = Message),
        (status = 401),
        CreateError
    ),
)]
async fn create_song(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongService>,
    Json(dto): Json<NewCorrectionDto<NewSong>>,
) -> Result<Message, CreateError> {
    service.create(dto.with_author(user)).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song/{id}",
    request_body = NewSong,
    responses(
		(status = 200, body = Message),
        (status = 401),
        UpsertCorrectionError
    ),
)]
async fn update_song(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongService>,
    Path(song_id): Path<i32>,
    Json(input): Json<NewCorrectionDto<NewSong>>,
) -> Result<Message, UpsertCorrectionError> {
    service
        .upsert_correction(song_id, input.with_author(user))
        .await?;

    Ok(Message::ok())
}
