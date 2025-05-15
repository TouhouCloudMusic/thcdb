use axum::Json;
use axum::extract::{Path, Query, State};
use itertools::Itertools;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::ArcAppState;
use crate::api_response::{Data, Message};
use crate::dto::song::{NewSong, SongResponse};
use crate::error::ServiceError;
use crate::service::song::Service;
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
    DataSongResponse, SongResponse
    DataVecSongResponse, Vec<SongResponse>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song/{id}",
    responses(
		(status = 200, body = DataSongResponse),
		ServiceError
    ),
)]
async fn find_song_by_id(
    State(service): State<Service>,
    Path(id): Path<i32>,
) -> Result<Data<SongResponse>, ServiceError> {
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
		(status = 200, body = DataVecSongResponse),
		ServiceError
    ),
)]
async fn find_song_by_keyword(
    State(service): State<Service>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<SongResponse>>, ServiceError> {
    service
        .find_by_keyword(query.keyword)
        .await
        .map(|x| x.into_iter().collect_vec().into())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song",
    request_body = NewSong,
    responses(
		(status = 200, body = Message),
        (status = 401),
        ServiceError
    ),
)]
async fn create_song(
    CurrentUser(user): CurrentUser,
    State(service): State<Service>,
    Json(input): Json<NewSong>,
) -> Result<Message, ServiceError> {
    service.create(user.id, input).await?;

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
        ServiceError
    ),
)]
async fn update_song(
    CurrentUser(user): CurrentUser,
    State(service): State<Service>,
    Path(song_id): Path<i32>,
    Json(input): Json<NewSong>,
) -> Result<Message, ServiceError> {
    service
        .create_or_update_correction(&user, song_id, input)
        .await?;

    Ok(Message::ok())
}
