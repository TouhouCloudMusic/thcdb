use std::num::NonZeroU8;

use artist_repo::credits::CreditsCursor;
use artist_repo::model::{
    ArtistCreditScope, ArtistCreditSort, ArtistSongCredit, Credit, CreditQuery,
};
use axum::extract::{Path, Query, State};
use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
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
        .with_public(|r| r.routes(routes!(get_artist_credits)))
        .finish()
}

struct ArtistCreditsCursor(CreditsCursor);

impl Serialize for ArtistCreditsCursor {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let payload =
            serde_json::to_vec(&self.0).map_err(serde::ser::Error::custom)?;
        serializer.serialize_str(&BASE64_URL_SAFE_NO_PAD.encode(payload))
    }
}

impl<'de> Deserialize<'de> for ArtistCreditsCursor {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let encoded = String::deserialize(deserializer)?;
        let payload = BASE64_URL_SAFE_NO_PAD
            .decode(encoded)
            .map_err(serde::de::Error::custom)?;
        serde_json::from_slice(&payload)
            .map(Self)
            .map_err(serde::de::Error::custom)
    }
}

#[derive(Deserialize, IntoParams)]
struct CreditQueryDto {
    #[param(value_type = Option<String>)]
    cursor: Option<ArtistCreditsCursor>,
    #[serde(default)]
    scope: ArtistCreditScope,
    #[serde(default)]
    sort: ArtistCreditSort,
    role_id: Option<i32>,
    #[param(value_type = u8, minimum = 1, maximum = 255)]
    limit: NonZeroU8,
}

#[derive(Serialize, ToSchema)]
struct ArtistCredits {
    release: Vec<Credit>,
    song: Vec<ArtistSongCredit>,
    #[schema(value_type = Option<String>)]
    next_cursor: Option<ArtistCreditsCursor>,
}

impl From<artist_repo::model::ArtistCredits> for ArtistCredits {
    fn from(page: artist_repo::model::ArtistCredits) -> Self {
        Self {
            release: page.release,
            song: page.song,
            next_cursor: page.next_cursor.map(ArtistCreditsCursor),
        }
    }
}

data!(DataArtistCredits, ArtistCredits);

#[utoipa::path(
    get,
    tag = TAG,
    path = "/artist/{id}/credits",
    params(CreditQueryDto),
    responses((status = 200, body = DataArtistCredits)),
)]
async fn get_artist_credits(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(dto): Query<CreditQueryDto>,
) -> Result<Data<ArtistCredits>, DatabaseError> {
    let page = artist_repo::credits::credits(
        &repo,
        CreditQuery {
            artist_id: id,
            cursor: dto.cursor.map(|cursor| cursor.0),
            limit: dto.limit.get(),
            scope: dto.scope,
            sort: dto.sort,
            role_id: dto.role_id,
        },
    )
    .await?;
    Ok(Data::from(ArtistCredits::from(page)))
}
