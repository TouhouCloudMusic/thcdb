use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{
    ArtistFilter, CommonFilter, FindManyFilter, PaginationQuery, repo,
};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data, state};
use crate::domain::shared::Paginated;
use crate::features::artist::model::Artist;
use crate::infra::error::Error;

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_artist_by_id))
                .routes(routes!(find_many_artist))
                .routes(routes!(explore_artist))
        })
        .finish()
}

data!(
    DataOptionArtist, Option<Artist>
    DataVecArtist, Vec<Artist>
    DataPaginatedArtist, Paginated<Artist>
);

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}",
    params(
        CommonFilter
    ),
    responses(
        (status = 200, body = DataOptionArtist),
    ),
)]
async fn find_artist_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    axum_extra::extract::Query(common): axum_extra::extract::Query<
        CommonFilter,
    >,
) -> Result<Data<Option<Artist>>, Error> {
    repo::find_one(&repo, id, common)
        .await
        .map(Into::into)
        .map_err(Into::into)
}

#[derive(Deserialize, IntoParams)]
struct FindManyFilterDto {
    keyword: String,
}

impl From<FindManyFilterDto> for FindManyFilter {
    fn from(value: FindManyFilterDto) -> Self {
        Self::Keyword(value.keyword)
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist",
    params(
        FindManyFilterDto,
        CommonFilter
    ),
    responses(
        (status = 200, body = DataVecArtist),
    ),
)]
async fn find_many_artist(
    State(repo): State<state::SeaOrmRepository>,
    axum_extra::extract::Query(query): axum_extra::extract::Query<
        FindManyFilterDto,
    >,
    axum_extra::extract::Query(common): axum_extra::extract::Query<
        CommonFilter,
    >,
) -> Result<Data<Vec<Artist>>, Error> {
    repo::find_many(&repo, query.into(), common)
        .await
        .map(Into::into)
        .map_err(Into::into)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/explore",
    params(ArtistFilter, PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedArtist),
        Error,
    ),
)]
async fn explore_artist(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<ArtistFilter>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<Paginated<Artist>>, Error> {
    let normalized = filter.with_sort_defaults();
    tracing::info!(?normalized, "explore_artist: incoming query");
    repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Into::into)
        .map_err(Into::into)
}
