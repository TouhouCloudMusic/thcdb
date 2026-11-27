use std::collections::HashMap;

use domain::credit_role::CreditRoleRef;
use domain::shared::SimpleArtist;
use entity::{artist, credit_role};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};
use serde::Serialize;
use tracing::warn;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongCredit {
    pub artist: SimpleArtist,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<CreditRoleRef>,
}

pub struct ArtistCreditReferences {
    artists: HashMap<i32, SimpleArtist>,
    roles: HashMap<i32, CreditRoleRef>,
}

impl ArtistCreditReferences {
    pub fn artist(&self, artist_id: i32) -> Option<SimpleArtist> {
        self.artists.get(&artist_id).cloned().or_else(|| {
            warn!(artist_id, "discarding item with missing artist reference");
            None
        })
    }

    pub fn credit(
        &self,
        artist_id: i32,
        role_id: Option<i32>,
    ) -> Option<SongCredit> {
        let artist = self.artist(artist_id)?;
        let role = match role_id {
            Some(role_id) => {
                Some(self.roles.get(&role_id).cloned().or_else(|| {
                    warn!(
                        role_id,
                        "discarding credit with missing role reference"
                    );
                    None
                })?)
            }
            None => None,
        };

        Some(SongCredit { artist, role })
    }
}

pub async fn load_artist_credit_references(
    credits: &[(i32, Option<i32>)],
    db: &impl ConnectionTrait,
) -> Result<ArtistCreditReferences, DatabaseError> {
    let artists = artist::Entity::find()
        .filter(
            artist::Column::Id
                .is_in(credits.iter().map(|(artist_id, _)| *artist_id)),
        )
        .all(db)
        .await
        .db_context("load credit artists")?
        .into_iter()
        .map(|artist| (artist.id, artist.into()))
        .collect();
    let roles = credit_role::Entity::find()
        .filter(
            credit_role::Column::Id
                .is_in(credits.iter().filter_map(|(_, role_id)| *role_id)),
        )
        .all(db)
        .await
        .db_context("load credit roles")?
        .into_iter()
        .map(|role| (role.id, role.into()))
        .collect();

    Ok(ArtistCreditReferences { artists, roles })
}
