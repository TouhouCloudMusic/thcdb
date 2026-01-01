use axum::extract::{Path, State};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::infra::error::Error;
use crate::features::correction::repo;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(pending_correction)))
        .finish()
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
enum EntityTypePath {
    Artist,
    Label,
    Release,
    Song,
    Tag,
    Event,
    SongLyrics,
    CreditRole,
}

impl From<EntityTypePath> for entity::enums::EntityType {
    fn from(value: EntityTypePath) -> Self {
        match value {
            EntityTypePath::Artist => Self::Artist,
            EntityTypePath::Label => Self::Label,
            EntityTypePath::Release => Self::Release,
            EntityTypePath::Song => Self::Song,
            EntityTypePath::Tag => Self::Tag,
            EntityTypePath::Event => Self::Event,
            EntityTypePath::SongLyrics => Self::SongLyrics,
            EntityTypePath::CreditRole => Self::CreditRole,
        }
    }
}

#[derive(Deserialize, IntoParams, ToSchema)]
struct PendingCorrectionPath {
    // https://github.com/scalar/scalar/issues/4309
    // External Bug: Not shown in docs if not inline
    // TODO: remove inline after bug fix
    #[param(inline)]
    entity_type: EntityTypePath,
    id: i32,
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/{entity_type}/{id}/pending-correction",
    params(PendingCorrectionPath),
    responses(
        (status = 200, body = Data<Option<i32>>),
    ),
)]
async fn pending_correction(
    CurrentUser(_user): CurrentUser,
    Path(PendingCorrectionPath { entity_type, id }): Path<
        PendingCorrectionPath,
    >,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<Option<i32>>, Error> {
    let correction_id =
        repo::find_pending_id(&repo, id, entity_type.into()).await?;
    Ok(Data::from(correction_id))
}
