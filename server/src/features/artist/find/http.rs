use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{ArtistFilter, CommonFilter, FindManyFilter, PageQuery, repo};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data, state};
use crate::domain::shared::PageResponse;
use crate::features::artist::model::Artist;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::http::api_response::{AppError, Data, Error as ApiError};

const TAG: &str = "Artist";

fn database_error(err: DatabaseError) -> AppError {
    err.into()
}

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
) -> Result<Data<Option<Artist>>, AppError> {
    repo::find_one(&repo, id, common)
        .await
        .with_operation("find artist by id")
        .map(Data::from)
        .map_err(database_error)
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
) -> Result<Data<Vec<Artist>>, AppError> {
    repo::find_many(&repo, query.into(), common)
        .await
        .with_operation("find artists by keyword")
        .map(Data::from)
        .map_err(database_error)
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
) -> Result<Data<PageResponse<Artist>>, AppError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.artist.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    repo::find_by_filter(&repo, normalized, pagination)
        .await
        .with_operation("explore artists")
        .map(Data::from)
        .map_err(database_error)
}
