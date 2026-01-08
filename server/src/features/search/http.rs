use axum::extract::{Query, State};
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use strum::EnumCount;
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
use crate::domain::shared::{Paginated, SearchTerm, SearchTermConfig};
use crate::domain::song::SongRef;
use crate::domain::tag::TagRef;
use crate::infra::error::Error as InfraError;
use crate::shared;
use crate::shared::error::MessageValidationError as ValidationError;

#[derive(
    Clone, Copy, Debug, Deserialize, ToSchema, PartialEq, Eq, EnumCount,
)]
#[serde(rename_all = "kebab-case")]
pub enum SearchType {
    Artist,
    Release,
    Song,
    Event,
    Label,
    Tag,
}

#[derive(Clone, Debug, Deserialize, IntoParams)]
pub struct SearchQuery {
    search_term: String,

    #[serde(default, rename = "type")]
    types: Vec<SearchType>,

    #[param(minimum = 1, maximum = 50)]
    limit: Option<u32>,

    /// Cursor is an offset for stable pagination in relevance ordering.
    cursor: Option<i32>,
}

#[derive(Clone, Debug)]
pub struct ValidSearchQuery {
    pub search_term: SearchTerm,
    pub types: Vec<SearchType>,
    pub limit: u32,
    pub cursor: Option<i32>,
}

impl SearchQuery {
    const MAX_LIMIT: u32 = 50;
    const DEFAULT_LIMIT: u32 = 10;

    pub fn validate(self) -> Result<ValidSearchQuery, ValidationError> {
        let search_term =
            SearchTerm::try_new(self.search_term, SearchTermConfig::DEFAULT)?;

        if self.types.len() > SearchType::COUNT {
            return Err(ValidationError::new("too many search types"));
        }

        Ok(ValidSearchQuery {
            search_term,
            types: self.types,
            limit: self
                .limit
                .unwrap_or(Self::DEFAULT_LIMIT)
                .clamp(1, Self::MAX_LIMIT),
            cursor: self.cursor.map(|value| value.max(0)),
        })
    }
}

#[derive(Clone, Debug)]
pub enum SearchScope {
    All,
    Only(Vec<SearchType>),
}

impl SearchScope {
    pub fn new(mut types: Vec<SearchType>) -> Result<Self, ValidationError> {
        if types.is_empty() {
            return Ok(SearchScope::All);
        }
        types.sort_by_key(|t| *t as u8);
        types.dedup();
        if types.len() > SearchType::COUNT {
            return Err(ValidationError::new("too many search types"));
        }
        Ok(SearchScope::Only(types))
    }

    pub fn requested_types(&self) -> Vec<SearchType> {
        match self {
            SearchScope::All => vec![
                SearchType::Artist,
                SearchType::Release,
                SearchType::Song,
                SearchType::Event,
                SearchType::Label,
                SearchType::Tag,
            ],
            SearchScope::Only(types) => types.clone(),
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub enum SearchPagination {
    Multi { limit: u32 },
    Single { limit: u32, cursor: i32 },
}

impl SearchPagination {
    pub fn new(
        scope: &SearchScope,
        limit: u32,
        cursor: Option<i32>,
    ) -> Result<Self, ValidationError> {
        match scope {
            SearchScope::All => {
                if cursor.is_some() {
                    return Err(ValidationError::new(
                        "cursor is not supported when type is not specified",
                    ));
                }
                Ok(SearchPagination::Multi { limit })
            }
            SearchScope::Only(types) if types.len() != 1 => {
                if cursor.is_some() {
                    return Err(ValidationError::new(
                        "cursor is only supported when type is specified exactly once",
                    ));
                }
                Ok(SearchPagination::Multi { limit })
            }
            SearchScope::Only(_) => Ok(SearchPagination::Single {
                limit,
                cursor: cursor.unwrap_or(0),
            }),
        }
    }
}

#[derive(Clone, Debug)]
pub struct SearchRequest {
    pub search_term: SearchTerm,
    pub scope: SearchScope,
    pub pagination: SearchPagination,
}

impl SearchRequest {
    pub fn try_from_query(
        query: ValidSearchQuery,
    ) -> Result<Self, ValidationError> {
        let ValidSearchQuery {
            search_term,
            types,
            limit,
            cursor,
        } = query;
        let scope = SearchScope::new(types)?;
        let pagination = SearchPagination::new(&scope, limit, cursor)?;
        Ok(Self {
            search_term,
            scope,
            pagination,
        })
    }
}

#[derive(Serialize, ToSchema)]
pub struct SearchResponse {
    pub artists: Paginated<SimpleArtist>,
    pub releases: Paginated<SimpleRelease>,
    pub songs: Paginated<SongRef>,
    pub events: Paginated<SimpleEvent>,
    pub labels: Paginated<SimpleLabel>,
    pub tags: Paginated<TagRef>,
}

impl SearchResponse {
    #[inline]
    pub async fn from_request(
        repo: &state::SeaOrmRepository,
        search_term: &SearchTerm,
        limit: u32,
        cursor: i32,
        requested_types: Vec<SearchType>,
    ) -> Result<Self, InfraError> {
        let search_term = search_term.as_str();
        let mut want_artist = false;
        let mut want_release = false;
        let mut want_song = false;
        let mut want_event = false;
        let mut want_label = false;
        let mut want_tag = false;
        for search_type in requested_types {
            match search_type {
                SearchType::Artist => want_artist = true,
                SearchType::Release => want_release = true,
                SearchType::Song => want_song = true,
                SearchType::Event => want_event = true,
                SearchType::Label => want_label = true,
                SearchType::Tag => want_tag = true,
            }
            if want_artist
                && want_release
                && want_song
                && want_event
                && want_label
                && want_tag
            {
                break;
            }
        }

        let (artists, releases, songs, events, labels, tags) = tokio::try_join!(
            async move {
                if want_artist {
                    repo::search_artists(repo, search_term, limit, cursor).await
                } else {
                    Ok(Paginated::default())
                }
            },
            async move {
                if want_release {
                    repo::search_releases(repo, search_term, limit, cursor)
                        .await
                } else {
                    Ok(Paginated::default())
                }
            },
            async move {
                if want_song {
                    repo::search_songs(repo, search_term, limit, cursor).await
                } else {
                    Ok(Paginated::default())
                }
            },
            async move {
                if want_event {
                    repo::search_events(repo, search_term, limit, cursor).await
                } else {
                    Ok(Paginated::default())
                }
            },
            async move {
                if want_label {
                    repo::search_labels(repo, search_term, limit, cursor).await
                } else {
                    Ok(Paginated::default())
                }
            },
            async move {
                if want_tag {
                    repo::search_tags(repo, search_term, limit, cursor).await
                } else {
                    Ok(Paginated::default())
                }
            },
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

data!(DataSearchResponse, SearchResponse);

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(search)))
        .finish()
}

#[utoipa::path(
    get,
    tag = "Search",
    path = "/search",
    params(SearchQuery),
    responses(
        (status = 200, body = DataSearchResponse),
    ),
)]
async fn search(
    State(sea_repo): State<state::SeaOrmRepository>,
    Query(query): Query<SearchQuery>,
) -> Result<Data<SearchResponse>, axum::response::Response> {
    let valid_query = query
        .validate()
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;
    let SearchRequest {
        search_term,
        scope,
        pagination,
    } = SearchRequest::try_from_query(valid_query)
        .map_err(|err| shared::http::Error::bad_request(err).into_response())?;

    let start = std::time::Instant::now();

    let (limit, cursor) = match pagination {
        SearchPagination::Multi { limit } => (limit, 0),
        SearchPagination::Single { limit, cursor } => (limit, cursor),
    };

    let requested_types = scope.requested_types();
    let response = SearchResponse::from_request(
        &sea_repo,
        &search_term,
        limit,
        cursor,
        requested_types,
    )
    .await
    .map_err(IntoResponse::into_response)?;

    tracing::info!(
        search_term = %search_term,
        ?scope,
        limit,
        cursor,
        elapsed_ms = start.elapsed().as_millis(),
        "search: completed"
    );

    Ok(Data::new(response))
}
