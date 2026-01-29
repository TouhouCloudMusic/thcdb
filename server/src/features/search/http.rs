use axum::extract::{Query, State};
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo;
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::artist::SimpleArtist;
use crate::domain::event::SimpleEvent;
use crate::domain::label::SimpleLabel;
use crate::domain::release::SimpleRelease;
use crate::domain::shared::{CursorResponse, SearchTerm, SearchTermConfig};
use crate::domain::song::SongRef;
use crate::domain::tag::TagRef;
use crate::infra::error::Error as InfraError;
use crate::shared;
use crate::shared::error::MessageValidationError as ValidationError;

#[derive(Clone, Debug, Deserialize, IntoParams)]
#[serde(deny_unknown_fields)]
pub struct SearchAllQuery {
    search_term: String,

    #[param(minimum = 1, maximum = 50)]
    limit: Option<u32>,
}

#[derive(Clone, Debug, Deserialize, IntoParams)]
#[serde(deny_unknown_fields)]
pub struct SearchSingleQuery {
    search_term: String,

    #[param(minimum = 1, maximum = 50)]
    limit: Option<u32>,

    /// Cursor is an offset for stable pagination in relevance ordering.
    cursor: Option<i32>,
}

#[derive(Clone, Debug)]
struct ValidSearchQuery {
    search_term: SearchTerm,
    limit: u32,
}

#[derive(Clone, Debug)]
struct ValidSearchSingleQuery {
    search_term: SearchTerm,
    limit: u32,
    cursor: i32,
}

impl SearchAllQuery {
    fn validate(self) -> Result<ValidSearchQuery, ValidationError> {
        let search_term =
            SearchTerm::try_new(self.search_term, SearchTermConfig::DEFAULT)?;

        Ok(ValidSearchQuery {
            search_term,
            limit: normalize_limit(self.limit),
        })
    }
}

impl SearchSingleQuery {
    fn validate(self) -> Result<ValidSearchSingleQuery, ValidationError> {
        let search_term =
            SearchTerm::try_new(self.search_term, SearchTermConfig::DEFAULT)?;

        Ok(ValidSearchSingleQuery {
            search_term,
            limit: normalize_limit(self.limit),
            cursor: self.cursor.unwrap_or(0).max(0),
        })
    }
}

fn normalize_limit(limit: Option<u32>) -> u32 {
    const MAX_LIMIT: u32 = 50;
    const DEFAULT_LIMIT: u32 = 10;

    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

#[derive(Serialize, ToSchema)]
pub struct SearchResponse {
    pub artists: CursorResponse<SimpleArtist>,
    pub releases: CursorResponse<SimpleRelease>,
    pub songs: CursorResponse<SongRef>,
    pub events: CursorResponse<SimpleEvent>,
    pub labels: CursorResponse<SimpleLabel>,
    pub tags: CursorResponse<TagRef>,
}

impl SearchResponse {
    #[inline]
    pub async fn from_request(
        repo: &state::SeaOrmRepository,
        search_term: &SearchTerm,
        limit: u32,
        cursor: i32,
    ) -> Result<Self, InfraError> {
        let search_term = search_term.as_str();
        let (artists, releases, songs, events, labels, tags) = tokio::try_join!(
            repo::search_artists(repo, search_term, limit, cursor),
            repo::search_releases(repo, search_term, limit, cursor),
            repo::search_songs(repo, search_term, limit, cursor),
            repo::search_events(repo, search_term, limit, cursor),
            repo::search_labels(repo, search_term, limit, cursor),
            repo::search_tags(repo, search_term, limit, cursor),
        )?;

        Ok(Self {
            artists,
            releases,
            songs,
            events,
            labels,
            tags,
        })
    }
}

data! {
    DataSearchResponse, SearchResponse
    DataPaginatedSimpleArtist, CursorResponse<SimpleArtist>
    DataPaginatedSimpleRelease, CursorResponse<SimpleRelease>
    DataPaginatedSongRef, CursorResponse<SongRef>
    DataPaginatedSimpleEvent, CursorResponse<SimpleEvent>
    DataPaginatedSimpleLabel, CursorResponse<SimpleLabel>
    DataPaginatedTagRef, CursorResponse<TagRef>
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(search_all))
                .routes(routes!(search_artist))
                .routes(routes!(search_release))
                .routes(routes!(search_song))
                .routes(routes!(search_event))
                .routes(routes!(search_label))
                .routes(routes!(search_tag))
        })
        .finish()
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search",
    params(SearchAllQuery),
    responses(
        (status = 200, body = DataSearchResponse),
    ),
)]
async fn search_all(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchAllQuery>,
) -> Result<Data<SearchResponse>, axum::response::Response> {
    let ValidSearchQuery { search_term, limit } = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();

    let response =
        SearchResponse::from_request(&sea_repo, &search_term, limit, 0)
            .await
            .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        scope = "all",
        limit,
        cursor = 0,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/artist",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataPaginatedSimpleArtist),
    ),
)]
async fn search_artist(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SimpleArtist>>, axum::response::Response> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response = repo::search_artists(&sea_repo, search_term, limit, cursor)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        scope = "artist",
        limit,
        cursor,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/release",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataPaginatedSimpleRelease),
    ),
)]
async fn search_release(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SimpleRelease>>, axum::response::Response> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response = repo::search_releases(&sea_repo, search_term, limit, cursor)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        scope = "release",
        limit,
        cursor,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/song",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataPaginatedSongRef),
    ),
)]
async fn search_song(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SongRef>>, axum::response::Response> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response = repo::search_songs(&sea_repo, search_term, limit, cursor)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        scope = "song",
        limit,
        cursor,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/event",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataPaginatedSimpleEvent),
    ),
)]
async fn search_event(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SimpleEvent>>, axum::response::Response> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response = repo::search_events(&sea_repo, search_term, limit, cursor)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        scope = "event",
        limit,
        cursor,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/label",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataPaginatedSimpleLabel),
    ),
)]
async fn search_label(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SimpleLabel>>, axum::response::Response> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response = repo::search_labels(&sea_repo, search_term, limit, cursor)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        scope = "label",
        limit,
        cursor,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/tag",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataPaginatedTagRef),
    ),
)]
async fn search_tag(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<TagRef>>, axum::response::Response> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response = repo::search_tags(&sea_repo, search_term, limit, cursor)
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        scope = "tag",
        limit,
        cursor,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}
