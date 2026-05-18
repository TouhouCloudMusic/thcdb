use axum::extract::{Path, Query, State};
use domain::shared::PageResponse;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{ArtistFilter, CommonFilter, FindManyFilter, PageQuery, repo};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data, state};
use crate::features::artist::model::Artist;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::{Data, Error as ApiError};

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
    DataPageArtist, PageResponse<Artist>
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
) -> Result<Data<Option<Artist>>, DatabaseError> {
    repo::find_one(&repo, id, common).await.map(Data::from)
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
) -> Result<Data<Vec<Artist>>, DatabaseError> {
    repo::find_many(&repo, query.into(), common)
        .await
        .map(Data::from)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/explore",
    params(ArtistFilter, PageQuery),
    responses(
        (status = 200, body = DataPageArtist),
        ApiError,
    ),
)]
async fn explore_artist(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<ArtistFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<Artist>>, DatabaseError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.artist.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Data::from)
}
