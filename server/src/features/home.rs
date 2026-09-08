use axum::extract::State;
use entity::{artist, release, song, tag};
use popularity_core::Ranking;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
};
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
use crate::infra::database::utils::sort_by_id_list;
use crate::shared::http::api_response::{AppError, Data};

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

    Ok(PopularItems {
        releases: sort_by_id_list(releases, &ranking.release_ids, |release| {
            release.id
        }),
        artists: sort_by_id_list(artists, &ranking.artist_ids, |artist| {
            artist.id
        }),
    })
}
