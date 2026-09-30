use std::collections::HashMap;

use domain::credit_role::CreditRoleRef;
use domain::shared::{Language, LocalizedTitle, SimpleArtist};
use entity::{artist, credit_role, language};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};
use tracing::warn;

use crate::features::song::model::SongCredit;

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
        .db_operation("load credit artists")?
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
        .db_operation("load credit roles")?
        .into_iter()
        .map(|role| (role.id, role.into()))
        .collect();

    Ok(ArtistCreditReferences { artists, roles })
}

pub struct LanguageReferences(HashMap<i32, Language>);

impl LanguageReferences {
    pub fn new(languages: impl IntoIterator<Item = Language>) -> Self {
        Self(
            languages
                .into_iter()
                .map(|language| (language.id, language))
                .collect(),
        )
    }

    pub fn language(&self, language_id: i32) -> Option<Language> {
        self.0.get(&language_id).cloned().or_else(|| {
            warn!(
                language_id,
                "discarding item with missing language reference"
            );
            None
        })
    }

    pub fn localized_title(
        &self,
        language_id: i32,
        title: String,
    ) -> Option<LocalizedTitle> {
        Some(LocalizedTitle {
            language: self.language(language_id)?,
            title,
        })
    }
}

pub async fn load_language_references(
    language_ids: impl IntoIterator<Item = i32>,
    db: &impl ConnectionTrait,
) -> Result<LanguageReferences, DatabaseError> {
    let languages = language::Entity::find()
        .filter(language::Column::Id.is_in(language_ids))
        .all(db)
        .await
        .db_operation("load languages")?
        .into_iter()
        .map(Into::into);

    Ok(LanguageReferences::new(languages))
}
