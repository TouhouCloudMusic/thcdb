use axum::Json;
use axum::extract::{Path, Query, State};
use axum::middleware::from_fn;
use itertools::Itertools;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message};
use crate::dto::song::{NewSong, SongResponse};
use crate::error::RepositoryError;
use crate::middleware::is_signed_in;
use crate::service::song::Service;
use crate::service::user::AuthSession;
use crate::state::AppState;
use crate::utils::MapInto;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create))
        .routes(routes!(update))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_by_id))
        .routes(routes!(find_by_keyword))
}

#[utoipa::path(
    get,
    path = "/song/{id}",
    responses(
		(status = 200, body = Data<SongResponse>),
		RepositoryError
    ),
)]
async fn find_by_id(
    State(service): State<Service>,
    Path(id): Path<i32>,
) -> Result<Data<SongResponse>, RepositoryError> {
    service.find_by_id(id).await.map_into()
}

#[derive(Deserialize, ToSchema)]
struct KwQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    path = "/song/{id}",
    responses(
		(status = 200, body = Data<Vec<SongResponse>>),
		RepositoryError
    ),
)]
async fn find_by_keyword(
    State(service): State<Service>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<SongResponse>>, RepositoryError> {
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
        RepositoryError
    ),
)]
async fn create(
    State(service): State<Service>,
    Json(input): Json<NewSong>,
) -> Result<Message, RepositoryError> {
    service.create(input).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    path = "/song/{id}",
    request_body = NewSong,
    responses(
		(status = 200, body = Message),
        (status = 401),
        RepositoryError
    ),
)]
async fn update(
    session: AuthSession,
    State(service): State<Service>,
    Path(song_id): Path<i32>,
    Json(mut input): Json<NewSong>,
) -> Result<Message, RepositoryError> {
    // TODO: 删除用户输入中的user id
    input.metadata.author_id = session.user.unwrap().id;

    service.create_or_update_correction(song_id, input).await?;

    Ok(Message::ok())
}
