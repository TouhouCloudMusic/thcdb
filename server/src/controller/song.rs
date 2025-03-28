use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::middleware::from_fn;
use itertools::Itertools;
use macros::use_session;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message};
use crate::dto::song::{NewSong, SongResponse};
use crate::error::ServiceError;
use crate::middleware::is_signed_in;
use crate::service::song::Service;
use crate::service::user::AuthSession;
use crate::state::AppState;
use crate::utils::MapInto;

pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(create_song))
        .routes(routes!(update_song))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_song_by_id))
        .routes(routes!(find_song_by_keyword))
}

super::data! {
    DataSongResponse, SongResponse
    DataVecSongResponse, Vec<SongResponse>
}

#[utoipa::path(
    get,
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
    path = "/song",
    request_body = NewSong,
    responses(
		(status = 200, body = Message),
        (status = 401),
        ServiceError
    ),
)]
#[use_session]
async fn create_song(
    State(service): State<Service>,
    Json(input): Json<NewSong>,
) -> Result<Message, ServiceError> {
    service.create(session.user.unwrap().id, input).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    path = "/song/{id}",
    request_body = NewSong,
    responses(
		(status = 200, body = Message),
        (status = 401),
        ServiceError
    ),
)]
async fn update_song(
    session: AuthSession,
    State(service): State<Service>,
    Path(song_id): Path<i32>,
    Json(input): Json<NewSong>,
) -> Result<Message, ServiceError> {
    service
        .create_or_update_correction(song_id, session.user.unwrap().id, input)
        .await?;

    Ok(Message::ok())
}
