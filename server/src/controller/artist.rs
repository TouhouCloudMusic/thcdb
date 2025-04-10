use axum::Json;
use axum::extract::{Path, Query, State};
use axum::middleware::from_fn;
use macros::use_service;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message, status_ok_schema};
use crate::dto::artist::{ArtistCorrection, ArtistResponse};
use crate::middleware::is_signed_in;
use crate::service::{self, artist};
use crate::state::{ArcAppState, AuthSession};
use crate::utils::MapInto;

type Error = service::artist::Error;

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_artist))
        .routes(routes!(upsert_artist_correction))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_artist_by_id))
        .routes(routes!(find_artist_by_keyword))
}

#[derive(ToSchema)]
struct DataArtist {
    #[schema(
        schema_with = status_ok_schema
    )]
    status: String,
    #[schema(inline = false)]
    data: ArtistResponse,
}

#[utoipa::path(
	get,
    tag = TAG,
	path = "/artist/{id}",
	responses(
		(status = 200, body = DataArtist),
		Error
	),
)]
async fn find_artist_by_id(
    State(artist_service): State<artist::Service>,
    Path(id): Path<i32>,
) -> Result<Data<ArtistResponse>, Error> {
    artist_service.find_by_id(id).await.map_into()
}

#[derive(Deserialize, IntoParams)]
struct KeywordQuery {
    keyword: String,
}

#[derive(ToSchema)]
struct DataVecArtist {
    #[schema(
        schema_with = status_ok_schema
    )]
    status: String,
    #[schema(inline = false)]
    data: Vec<ArtistResponse>,
}

#[utoipa::path(
	get,
    tag = TAG,
	path = "/artist",
    params(
        KeywordQuery
    ),
	responses(
		(status = 200, body = DataVecArtist),
		Error
	),
)]
#[use_service(artist)]
async fn find_artist_by_keyword(
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<ArtistResponse>>, Error> {
    artist_service
        .find_by_keyword(&query.keyword)
        .await
        .map_into()
}

#[utoipa::path(
	post,
    tag = TAG,
	path = "/artist",
	request_body = ArtistCorrection,
	responses(
		(status = 200, body = Message),
        (status = 401),
		Error
	),
)]
async fn create_artist(
    auth_session: AuthSession,
    State(artist_service): State<artist::Service>,
    Json(input): Json<ArtistCorrection>,
) -> Result<Message, Error> {
    artist_service
        .create(auth_session.user.unwrap().id, input)
        .await?;

    Ok(Message::ok())
}

#[utoipa::path(
	post,
    tag = TAG,
	path = "/artist/{id}",
	request_body = ArtistCorrection,
	responses(
		(status = 200, body = Message),
        (status = 401),
		Error
	),
)]
#[use_service(artist)]
async fn upsert_artist_correction(
    session: AuthSession,
    Path(id): Path<i32>,
    Json(input): Json<ArtistCorrection>,
) -> Result<Message, Error> {
    artist_service
        .create_or_update_correction(id, session.user.unwrap().id, input)
        .await?;

    Ok(Message::ok())
}
