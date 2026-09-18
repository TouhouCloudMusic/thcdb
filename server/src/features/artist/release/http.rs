use artist_repo::model::{
    Appearance, AppearanceQuery, Discography, DiscographyQuery,
};
use axum::extract::{Path, Query, State};
use domain::shared::{Cursor, CursorResponse};
use entity::enums::ReleaseType;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::Data;

const TAG: &str = "Artist";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_artist_discographies_init))
                .routes(routes!(find_artist_discographies_by_type))
                .routes(routes!(find_artist_appearances))
        })
        .finish()
}

data!(
    DataPaginatedDiscography, CursorResponse<Discography>
    DataPaginatedAppearance, CursorResponse<Appearance>
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
) -> Result<Data<CursorResponse<Appearance>>, DatabaseError> {
    artist_repo::releases::appearance(&repo, dto.into_query(id))
        .await
        .map(Data::from)
        .map_err(DatabaseError::from)
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
) -> Result<Data<CursorResponse<Discography>>, DatabaseError> {
    artist_repo::releases::discography(&repo, dto.into_query(id))
        .await
        .map(Data::from)
        .map_err(DatabaseError::from)
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
    album: CursorResponse<Discography>,
    ep: CursorResponse<Discography>,
    compilation: CursorResponse<Discography>,
    single: CursorResponse<Discography>,
    demo: CursorResponse<Discography>,
    other: CursorResponse<Discography>,
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
) -> Result<Data<InitDiscography>, DatabaseError> {
    let (album, ep, compilation, single, demo, other) = tokio::try_join!(
        artist_repo::releases::discography(
            &repo,
            dto.to_query(id, ReleaseType::Album)
        ),
        artist_repo::releases::discography(
            &repo,
            dto.to_query(id, ReleaseType::Ep)
        ),
        artist_repo::releases::discography(
            &repo,
            dto.to_query(id, ReleaseType::Compilation),
        ),
        artist_repo::releases::discography(
            &repo,
            dto.to_query(id, ReleaseType::Single)
        ),
        artist_repo::releases::discography(
            &repo,
            dto.to_query(id, ReleaseType::Demo)
        ),
        artist_repo::releases::discography(
            &repo,
            dto.to_query(id, ReleaseType::Other)
        ),
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
