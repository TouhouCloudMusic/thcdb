use std::collections::HashMap;

use axum::extract::State;
use entity::{artist, release, song, tag};
use popularity_core::Ranking;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect,
};
use sea_query::{Expr, Func};
use serde::Serialize;
use tokio::try_join;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::artist::list::ArtistListItem;
use crate::features::release::list::ReleaseListItem;
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::{AppError, Data};

const HOME_ITEMS_LIMIT: usize = 6;

#[derive(Serialize, ToSchema)]
pub struct HomeStatistics {
    pub artists: u64,
    pub releases: u64,
    pub songs: u64,
    pub tags: u64,
}

#[derive(Serialize, ToSchema)]
pub struct PopularItems {
    pub releases: Vec<ReleaseListItem>,
    pub artists: Vec<ArtistListItem>,
}

#[derive(Serialize, ToSchema)]
pub struct Home {
    pub statistics: HomeStatistics,
    pub popular: PopularItems,
}

data! {
    DataHome, Home
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(get_home)))
        .finish()
}

#[utoipa::path(
    get,
    path = "/home",
    tag = "Home",
    responses(
        (status = 200, body = DataHome),
    ),
)]
async fn get_home(
    State(state): State<ArcAppState>,
) -> Result<Data<Home>, AppError> {
    let db = &state.database;

    let ranking = popularity_core::load_ranking(db, &state.redis_pool())
        .await
        .map_err(AppError::internal)?;
    let popular = load_popular_items(db, &ranking).await?;

    let (artists_count, releases_count, songs_count, tags_count) = try_join!(
        artist::Entity::find().count(db),
        release::Entity::find().count(db),
        song::Entity::find().count(db),
        tag::Entity::find().count(db),
    )
    .db_operation("load home metadata")?;

    Ok(Home {
        statistics: HomeStatistics {
            artists: artists_count,
            releases: releases_count,
            songs: songs_count,
            tags: tags_count,
        },
        popular,
    }
    .into())
}

async fn load_popular_items(
    conn: &impl ConnectionTrait,
    ranking: &Ranking,
) -> Result<PopularItems, AppError> {
    let (releases, artists) = tokio::try_join!(
        async {
            if ranking.release_ids.is_empty() {
                return Ok(Vec::new());
            }
            crate::features::release::list::load(
                release::Entity::find().filter(
                    release::Column::Id
                        .is_in(ranking.release_ids.iter().copied()),
                ),
                conn,
            )
            .await
            .map_err(AppError::internal)
        },
        async {
            if ranking.artist_ids.is_empty() {
                return Ok(Vec::new());
            }
            crate::features::artist::list::load(
                artist::Entity::find().filter(
                    artist::Column::Id
                        .is_in(ranking.artist_ids.iter().copied()),
                ),
                conn,
            )
            .await
            .map_err(AppError::internal)
        },
    )?;

    let releases = {
        let mut releases_by_id = releases
            .into_iter()
            .map(|release| (release.id, release))
            .collect::<HashMap<_, _>>();

        ranking
            .release_ids
            .iter()
            .filter_map(|id| releases_by_id.remove(id))
            .collect::<Vec<_>>()
    };
    let releases = if releases.len() < HOME_ITEMS_LIMIT {
        let excluded_release_ids = releases
            .iter()
            .map(|release| release.id)
            .collect::<Vec<_>>();
        let random_releases = load_random_releases(
            conn,
            &excluded_release_ids,
            HOME_ITEMS_LIMIT - releases.len(),
        )
        .await?;

        releases.into_iter().chain(random_releases).collect()
    } else {
        releases
    };
    let artists = {
        let mut artists_by_id = artists
            .into_iter()
            .map(|artist| (artist.id, artist))
            .collect::<HashMap<_, _>>();

        ranking
            .artist_ids
            .iter()
            .filter_map(|id| artists_by_id.remove(id))
            .collect::<Vec<_>>()
    };
    let artists = if artists.len() < HOME_ITEMS_LIMIT {
        let excluded_artist_ids =
            artists.iter().map(|artist| artist.id).collect::<Vec<_>>();
        let random_artists = load_random_artists(
            conn,
            &excluded_artist_ids,
            HOME_ITEMS_LIMIT - artists.len(),
        )
        .await?;

        artists.into_iter().chain(random_artists).collect()
    } else {
        artists
    };

    Ok(PopularItems { releases, artists })
}

async fn load_random_releases(
    conn: &impl ConnectionTrait,
    excluded_release_ids: &[i32],
    count: usize,
) -> Result<Vec<ReleaseListItem>, AppError> {
    let select = release::Entity::find();
    let select = if excluded_release_ids.is_empty() {
        select
    } else {
        select.filter(
            release::Column::Id.is_not_in(excluded_release_ids.iter().copied()),
        )
    };

    crate::features::release::list::load(
        select
            .order_by_asc(Expr::expr(Func::random()))
            .limit(count as u64),
        conn,
    )
    .await
    .map_err(AppError::internal)
}

async fn load_random_artists(
    conn: &impl ConnectionTrait,
    excluded_artist_ids: &[i32],
    count: usize,
) -> Result<Vec<ArtistListItem>, AppError> {
    let select = artist::Entity::find();
    let select = if excluded_artist_ids.is_empty() {
        select
    } else {
        select.filter(
            artist::Column::Id.is_not_in(excluded_artist_ids.iter().copied()),
        )
    };

    crate::features::artist::list::load(
        select
            .order_by_asc(Expr::expr(Func::random()))
            .limit(count as u64),
        conn,
    )
    .await
    .map_err(AppError::internal)
}
