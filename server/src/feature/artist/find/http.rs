use axum::extract::{Path, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, CommonFilter, FindManyFilter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data, state};
use crate::domain::artist::Artist;
use crate::infra::error::Error;

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_artist_by_id))
                .routes(routes!(find_many_artist))
        })
        .finish()
}

data!(
    DataOptionArtist, Option<Artist>
    DataVecArtist, Vec<Artist>
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
    repo::find_one(&repo, id, common).await.bimap_into()
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
        .bimap_into()
}
