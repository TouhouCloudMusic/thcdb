use std::collections::HashMap;

use axum::extract::{Path, State};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::infra::error::Error;

use entity::enums::CorrectionStatus;
use entity::{correction as correction_entity, correction_revision, user};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};

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
struct EntityCorrectionsPath {
    #[param(inline)]
    entity_type: EntityTypePath,
    id: i32,
}

#[derive(Clone, Serialize, ToSchema)]
struct CorrectionUserSummary {
    id: i32,
    name: String,
}

#[derive(Serialize, ToSchema)]
struct CorrectionHistoryItem {
    id: i32,
    r#type: entity::enums::CorrectionType,
    created_at: chrono::DateTime<chrono::FixedOffset>,
    handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    author: CorrectionUserSummary,
    description: String,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(entity_corrections)))
        .finish()
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/{entity_type}/{id}/corrections",
    params(EntityCorrectionsPath),
    responses(
        (status = 200, body = Data<Vec<CorrectionHistoryItem>>),
    ),
)]
async fn entity_corrections(
    CurrentUser(_user): CurrentUser,
    Path(EntityCorrectionsPath { entity_type, id }): Path<EntityCorrectionsPath>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<Vec<CorrectionHistoryItem>>, Error> {
    let entity_type = entity::enums::EntityType::from(entity_type);
    let corrections = correction_entity::Entity::find()
        .filter(correction_entity::Column::EntityId.eq(id))
        .filter(correction_entity::Column::EntityType.eq(entity_type))
        .filter(correction_entity::Column::Status.eq(CorrectionStatus::Approved))
        .order_by_desc(correction_entity::Column::HandledAt)
        .order_by_desc(correction_entity::Column::CreatedAt)
        .all(&repo.conn)
        .await?;

    if corrections.is_empty() {
        return Ok(Data::from(Vec::new()));
    }

    let correction_ids = corrections.iter().map(|model| model.id).collect::<Vec<_>>();

    let revisions = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.is_in(correction_ids.clone()))
        .order_by_asc(correction_revision::Column::CorrectionId)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .all(&repo.conn)
        .await?;

    let mut revision_map = HashMap::new();
    for revision in revisions {
        revision_map.entry(revision.correction_id).or_insert(revision);
    }

    let author_ids = revision_map
        .values()
        .map(|revision| revision.author_id)
        .collect::<Vec<_>>();

    let authors = user::Entity::find()
        .filter(user::Column::Id.is_in(author_ids))
        .all(&repo.conn)
        .await?;

    let author_map = authors
        .into_iter()
        .map(|author| {
            (
                author.id,
                CorrectionUserSummary {
                    id: author.id,
                    name: author.name,
                },
            )
        })
        .collect::<HashMap<_, _>>();

    let items = corrections
        .into_iter()
        .filter_map(|correction| {
            let revision = revision_map.get(&correction.id)?;
            let author = author_map
                .get(&revision.author_id)
                .cloned()
                .unwrap_or_else(|| CorrectionUserSummary {
                    id: revision.author_id,
                    name: "Unknown".to_string(),
                });

            Some(CorrectionHistoryItem {
                id: correction.id,
                r#type: correction.r#type,
                created_at: correction.created_at,
                handled_at: correction.handled_at,
                author,
                description: revision.description.clone(),
            })
        })
        .collect::<Vec<_>>();

    Ok(Data::from(items))
}
