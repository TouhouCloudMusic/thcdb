use axum::extract::{Path, Query, State};
use domain::shared::PageResponse;
use rating_core::{RatingTarget, RatingTargetKind};
use release_repo::{FindReleaseFilter, Release, ReleaseListItem};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PageQuery, ReleaseFilter, repo};
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::release::model::ReleaseDetail;
use crate::infra::database::cache::LANGUAGE_CACHE;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::{AppError, Data, Error as ApiError};

const TAG: &str = "Release";

data!(
    DataOptionRelease, Option<Release>
    DataOptionReleaseDetail, Option<ReleaseDetail>
    DataVecRelease, Vec<Release>
    DataPageRelease, PageResponse<ReleaseListItem>
);

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_release_by_id))
                .routes(routes!(find_release_by_keyword))
                .routes(routes!(explore_release))
        })
        .finish()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/{id}",
    responses(
        (status = 200, body = DataOptionReleaseDetail),
    ),
)]
async fn find_release_by_id(
    session: AuthSession,
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<ReleaseDetail>>, AppError> {
    let Some(release) =
        release_repo::find_one(&repo.conn, FindReleaseFilter::Id(id), || {
            LANGUAGE_CACHE.get_or_init(&repo.conn)
        })
        .await
        .map_err(DatabaseError::from)?
    else {
        return Ok(Data::from(None));
    };

    let rating = rating_core::get(
        &repo.conn,
        RatingTarget {
            kind: RatingTargetKind::Release,
            id,
        },
        session.user.as_ref().map(|user| user.id),
    )
    .await?;

    Ok(Data::from(Some(ReleaseDetail { release, rating })))
}

#[derive(IntoParams, Deserialize)]
struct KwQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release",
    params(KwQuery),
    responses(
        (status = 200, body = DataVecRelease),
    ),
)]
async fn find_release_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<Release>>, DatabaseError> {
    let releases = release_repo::find_many(
        &repo.conn,
        FindReleaseFilter::Keyword(query.keyword),
        || LANGUAGE_CACHE.get_or_init(&repo.conn),
    )
    .await?;
    Ok(Data::from(releases))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/explore",
    params(ReleaseFilter, PageQuery),
    responses(
        (status = 200, body = DataPageRelease),
        ApiError,
    ),
)]
async fn explore_release(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<ReleaseFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<ReleaseListItem>>, DatabaseError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.release.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Data::from)
}
