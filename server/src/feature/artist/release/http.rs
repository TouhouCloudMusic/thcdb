use axum::extract::{Path, Query, State};
use entity::enums::ReleaseType;
use libfp::BifunctorExt;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::artist_release::{
    Appearance, AppearanceQuery, Credit, CreditQuery, Discography,
    DiscographyQuery,
};
use crate::domain::{Cursor, Paginated};
use crate::infra::error::Error;

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_artist_discographies_init))
                .routes(routes!(find_artist_discographies_by_type))
                .routes(routes!(find_artist_appearances))
                .routes(routes!(get_artist_credits))
        })
        .finish()
}

data!(
    DataPaginatedDiscography, Paginated<Discography>
    DataPaginatedAppearance, Paginated<Appearance>
    DataPaginatedCredit, Paginated<Credit>
);

#[derive(Deserialize, IntoParams)]
struct AppearanceQueryDto {
    cursor: i32,
    limit: u8,
}

impl AppearanceQueryDto {
    const fn into_query(self, artist_id: i32) -> AppearanceQuery {
        AppearanceQuery {
            artist_id,
            pagination: Cursor {
                at: self.cursor,
                limit: self.limit,
            },
        }
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/appearances",
    params(
        AppearanceQueryDto
    ),
    responses(
        (status = 200, body = DataPaginatedAppearance),
    ),
)]
async fn find_artist_appearances(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<AppearanceQueryDto>,
) -> Result<Data<Paginated<Appearance>>, Error> {
    super::repo::appearance(&repo, dto.into_query(id))
        .await
        .bimap_into()
}

#[derive(Deserialize, IntoParams, ToSchema)]
struct CreditQueryDto {
    cursor: i32,
    limit: u8,
}

impl CreditQueryDto {
    const fn into_query(self, artist_id: i32) -> CreditQuery {
        CreditQuery {
            artist_id,
            pagination: Cursor {
                at: self.cursor,
                limit: self.limit,
            },
        }
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/credits",
    params(
        CreditQueryDto
    ),
    responses(
        (status = 200, body = DataPaginatedCredit),
    ),
)]
async fn get_artist_credits(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<CreditQueryDto>,
) -> Result<Data<Paginated<Credit>>, Error> {
    super::repo::credit(&repo, dto.into_query(id))
        .await
        .bimap_into()
}

#[derive(Deserialize, IntoParams)]
struct DiscographyQueryDto {
    release_type: ReleaseType,
    cursor: i32,
    limit: u8,
}

impl DiscographyQueryDto {
    const fn into_query(self, artist_id: i32) -> DiscographyQuery {
        DiscographyQuery {
            artist_id,
            release_type: self.release_type,
            pagination: Cursor {
                at: self.cursor,
                limit: self.limit,
            },
        }
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/discographies",
    params(
        DiscographyQueryDto
    ),
    responses(
        (status = 200, body = DataPaginatedDiscography),
    ),
)]
async fn find_artist_discographies_by_type(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<DiscographyQueryDto>,
) -> Result<Data<Paginated<Discography>>, Error> {
    super::repo::discography(&repo, dto.into_query(id))
        .await
        .bimap_into()
}

#[derive(Deserialize, IntoParams)]
struct InitDiscographyQueryDto {
    limit: u8,
}

impl InitDiscographyQueryDto {
    const fn to_query(
        &self,
        artist_id: i32,
        release_type: ReleaseType,
    ) -> DiscographyQuery {
        DiscographyQuery {
            artist_id,
            release_type,
            pagination: Cursor {
                at: 0,
                limit: self.limit,
            },
        }
    }
}

#[derive(Serialize, ToSchema)]
struct InitDiscography {
    album: Paginated<Discography>,
    ep: Paginated<Discography>,
    compilation: Paginated<Discography>,
    single: Paginated<Discography>,
    demo: Paginated<Discography>,
    other: Paginated<Discography>,
}

data! {
    DataInitDiscography, InitDiscography
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/discographies/init",
    params(
        InitDiscographyQueryDto
    ),
    responses(
        (status = 200, body = DataInitDiscography),
    ),
)]
async fn find_artist_discographies_init(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<InitDiscographyQueryDto>,
) -> Result<Data<InitDiscography>, Error> {
    let (album, ep, compilation, single, demo, other) = tokio::try_join!(
        super::repo::discography(&repo, dto.to_query(id, ReleaseType::Album)),
        super::repo::discography(&repo, dto.to_query(id, ReleaseType::Ep)),
        super::repo::discography(
            &repo,
            dto.to_query(id, ReleaseType::Compilation),
        ),
        super::repo::discography(&repo, dto.to_query(id, ReleaseType::Single)),
        super::repo::discography(&repo, dto.to_query(id, ReleaseType::Demo)),
        super::repo::discography(&repo, dto.to_query(id, ReleaseType::Other)),
    )?;

    Ok(Data::new(InitDiscography {
        album,
        ep,
        compilation,
        single,
        demo,
        other,
    }))
}
