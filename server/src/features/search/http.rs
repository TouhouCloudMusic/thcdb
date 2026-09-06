use axum::extract::{Query, State};
use axum::response::IntoResponse;
use domain::shared::CursorResponse;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{SearchResult, repo};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::artist::list::ArtistListItem;
use crate::features::event::list::EventListItem;
use crate::features::label::list::LabelListItem;
use crate::features::release::list::ReleaseListItem;
use crate::features::song::list::SongListItem;
use crate::features::tag::list::TagListItem;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::MessageValidationError as ValidationError;
use crate::shared::http::api_response::{AppError, Data};

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
enum Error {
    #[display("{_0}")]
    #[from]
    Validation(#[error(source)] ValidationError),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Validation(err) => {
                AppError::bad_request(err.to_string()).into_response()
            }
            Error::Database(err) => err.into_response(),
        }
    }
}

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

#[derive(Clone, Copy, Debug)]
struct SearchTermConfig {
    min_len: usize,
    max_len: usize,
}

impl SearchTermConfig {
    const DEFAULT: Self = Self {
        min_len: 1,
        max_len: 256,
    };

    fn validate(&self, value: &str) -> Result<String, ValidationError> {
        let trimmed = value.trim();
        let len = trimmed.chars().take(self.max_len + 1).count();
        if len < self.min_len {
            return Err(ValidationError::new(format!(
                "keyword must be at least {} characters",
                self.min_len
            )));
        }
        if len > self.max_len {
            return Err(ValidationError::new("keyword is too long"));
        }
        Ok(trimmed.to_owned())
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct SearchTerm(String);

impl SearchTerm {
    fn try_new(
        value: impl Into<String>,
        config: SearchTermConfig,
    ) -> Result<Self, ValidationError> {
        let validated = config.validate(&value.into())?;
        Ok(Self(validated))
    }

    fn as_str(&self) -> &str {
        &self.0
    }
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
    pub artists: CursorResponse<SearchResult<ArtistListItem>>,
    pub releases: CursorResponse<SearchResult<ReleaseListItem>>,
    pub songs: CursorResponse<SearchResult<SongListItem>>,
    pub events: CursorResponse<SearchResult<EventListItem>>,
    pub labels: CursorResponse<SearchResult<LabelListItem>>,
    pub tags: CursorResponse<SearchResult<TagListItem>>,
}

impl SearchResponse {
    #[inline]
    async fn from_request(
        repo: &state::SeaOrmRepository,
        search_term: &SearchTerm,
        limit: u32,
        cursor: i32,
    ) -> Result<Self, DatabaseError> {
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
    DataSearchArtistPage, CursorResponse<SearchResult<ArtistListItem>>
    DataSearchReleasePage, CursorResponse<SearchResult<ReleaseListItem>>
    DataSearchSongPage, CursorResponse<SearchResult<SongListItem>>
    DataSearchEventPage, CursorResponse<SearchResult<EventListItem>>
    DataSearchLabelPage, CursorResponse<SearchResult<LabelListItem>>
    DataSearchTagPage, CursorResponse<SearchResult<TagListItem>>
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
) -> Result<Data<SearchResponse>, Error> {
    let ValidSearchQuery { search_term, limit } = query.validate()?;

    let start = std::time::Instant::now();

    let response = Box::pin(SearchResponse::from_request(
        &sea_repo,
        &search_term,
        limit,
        0,
    ))
    .await?;

    log::info!(
        target: "features.search.http",
        search_term = search_term.as_str(),
        scope = "all",
        limit = limit,
        cursor = 0,
        elapsed_ms = start.elapsed().as_millis();
        "completed search"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/artist",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataSearchArtistPage),
    ),
)]
async fn search_artist(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SearchResult<ArtistListItem>>>, Error> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query.validate()?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response =
        repo::search_artists(&sea_repo, search_term, limit, cursor).await?;

    log::info!(
        target: "features.search.http",
        search_term = search_term,
        scope = "artist",
        limit = limit,
        cursor = cursor,
        elapsed_ms = start.elapsed().as_millis();
        "completed search"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/release",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataSearchReleasePage),
    ),
)]
async fn search_release(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SearchResult<ReleaseListItem>>>, Error> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query.validate()?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response =
        repo::search_releases(&sea_repo, search_term, limit, cursor).await?;

    log::info!(
        target: "features.search.http",
        search_term = search_term,
        scope = "release",
        limit = limit,
        cursor = cursor,
        elapsed_ms = start.elapsed().as_millis();
        "completed search"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/song",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataSearchSongPage),
    ),
)]
async fn search_song(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SearchResult<SongListItem>>>, Error> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query.validate()?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response =
        repo::search_songs(&sea_repo, search_term, limit, cursor).await?;

    log::info!(
        target: "features.search.http",
        search_term = search_term,
        scope = "song",
        limit = limit,
        cursor = cursor,
        elapsed_ms = start.elapsed().as_millis();
        "completed search"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/event",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataSearchEventPage),
    ),
)]
async fn search_event(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SearchResult<EventListItem>>>, Error> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query.validate()?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response =
        repo::search_events(&sea_repo, search_term, limit, cursor).await?;

    log::info!(
        target: "features.search.http",
        search_term = search_term,
        scope = "event",
        limit = limit,
        cursor = cursor,
        elapsed_ms = start.elapsed().as_millis();
        "completed search"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/label",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataSearchLabelPage),
    ),
)]
async fn search_label(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SearchResult<LabelListItem>>>, Error> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query.validate()?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response =
        repo::search_labels(&sea_repo, search_term, limit, cursor).await?;

    log::info!(
        target: "features.search.http",
        search_term = search_term,
        scope = "label",
        limit = limit,
        cursor = cursor,
        elapsed_ms = start.elapsed().as_millis();
        "completed search"
    );

    Ok(Data::new(response))
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search/tag",
    params(SearchSingleQuery),
    responses(
        (status = 200, body = DataSearchTagPage),
    ),
)]
async fn search_tag(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchSingleQuery>,
) -> Result<Data<CursorResponse<SearchResult<TagListItem>>>, Error> {
    let ValidSearchSingleQuery {
        search_term,
        limit,
        cursor,
    } = query.validate()?;

    let start = std::time::Instant::now();
    let search_term = search_term.as_str();
    let response =
        repo::search_tags(&sea_repo, search_term, limit, cursor).await?;

    log::info!(
        target: "features.search.http",
        search_term = search_term,
        scope = "tag",
        limit = limit,
        cursor = cursor,
        elapsed_ms = start.elapsed().as_millis();
        "completed search"
    );

    Ok(Data::new(response))
}
