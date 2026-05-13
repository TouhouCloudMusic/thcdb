use std::collections::BTreeSet;

use derive_more::Display;
use entity::enums::EntityType;
use entity::song_relation_type::Model as DbSongRelationType;
use macros::AutoMapper;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::artist::SimpleArtist;
use crate::domain::correction::CorrectionEntity;
use crate::domain::credit_role::CreditRoleRef;
use crate::domain::shared::{EntityIdent, Language, NewLocalizedName};
use crate::domain::song_lyrics::SongLyrics;

#[serde_with::apply(
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Song {
    pub id: i32,
    pub title: String,
    pub artists: Vec<SimpleArtist>,
    pub releases: Vec<SongRelease>,
    pub credits: Vec<SongCredit>,
    pub languages: Vec<Language>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub relations: Vec<SongRelation>,
    pub lyrics: Vec<SongLyrics>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRelease {
    pub id: i32,
    pub title: String,
    pub track_number: Option<String>,
    pub cover_art_url: Option<String>,
}

#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRef {
    pub id: i32,
    pub title: String,
}

#[derive(AutoMapper, Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
#[mapper(from(DbSongRelationType))]
pub struct SongRelationType {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongCredit {
    pub artist: SimpleArtist,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<CreditRoleRef>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct LocalizedTitle {
    pub language: Language,
    pub title: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRelation {
    pub song: SongRef,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artist: Option<SimpleArtist>,
    #[serde(rename = "type")]
    pub r#type: SongRelationType,
    pub description: String,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSong {
    pub title: EntityIdent,
    pub artists: Option<Vec<i32>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<NewLocalizedName>>,
    pub relations: Option<Vec<NewSongRelation>>,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSongCredit {
    pub artist_id: i32,
    #[serde(default)]
    pub role_id: Option<i32>,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSongRelation {
    pub related_song_id: i32,
    pub relation_type_id: i32,
    pub description: String,
}

pub type ValidationError =
    crate::shared::error::ValidationError<ValidationErrorKind>;

#[derive(Debug, Display, derive_more::Error)]
pub enum ValidationErrorKind {
    #[display("Song relation cannot target the same song")]
    SelfRelation,
    #[display("Song relation cannot contain duplicate songs")]
    DuplicateRelatedSong,
}
use ValidationErrorKind::*;

impl NewSong {
    pub fn validate(
        &self,
        song_id: Option<i32>,
    ) -> Result<(), ValidationError> {
        let Some(relations) = self.relations.as_ref() else {
            return Ok(());
        };

        let mut related_song_ids = BTreeSet::new();
        for relation in relations {
            if song_id.is_some_and(|id| id == relation.related_song_id) {
                return Err(SelfRelation.into());
            }

            if !related_song_ids.insert(relation.related_song_id) {
                return Err(DuplicateRelatedSong.into());
            }
        }

        Ok(())
    }
}

impl CorrectionEntity for NewSong {
    fn entity_type() -> EntityType {
        EntityType::Song
    }
}

#[cfg(test)]
mod tests {
    use std::mem::discriminant;

    use proptest::prelude::*;

    use super::ValidationErrorKind::*;
    use super::{
        NewSong, NewSongRelation, ValidationError, ValidationErrorKind,
    };
    use crate::domain::shared::EntityIdent;

    proptest! {
        #[test]
        fn validate_accepts_missing_relations(song_id in any::<i32>()) {
            let song = new_song(None);

            prop_assert!(song.validate(None).is_ok());
            prop_assert!(song.validate(Some(song_id)).is_ok());
        }

        #[test]
        fn validate_accepts_relations_without_duplicates_when_creating(
            related_song_ids in prop::collection::btree_set(any::<i32>(), 0..16),
        ) {
            let song = new_song(Some(
                related_song_ids.into_iter().map(new_relation).collect(),
            ));

            prop_assert!(song.validate(None).is_ok());
        }

        #[test]
        fn validate_accepts_relations_without_self_or_duplicates(
            song_id in any::<i32>(),
            related_song_ids in prop::collection::btree_set(any::<i32>(), 0..16),
        ) {
            let relations = related_song_ids
                .into_iter()
                .filter(|related_song_id| *related_song_id != song_id)
                .map(new_relation)
                .collect();
            let song = new_song(Some(relations));

            prop_assert!(song.validate(Some(song_id)).is_ok());
        }

        #[test]
        fn validate_rejects_self_relation(
            song_id in any::<i32>(),
            other_related_song_ids in prop::collection::btree_set(any::<i32>(), 0..16),
        ) {
            let song = new_song(Some(
                other_related_song_ids
                    .into_iter()
                    .filter(|related_song_id| *related_song_id != song_id)
                    .chain([song_id])
                    .map(new_relation)
                    .collect(),
            ));

            prop_assert!(has_error_kind(
                song.validate(Some(song_id)),
                &SelfRelation,
            ));
        }

        #[test]
        fn validate_rejects_duplicate_related_songs_when_creating(
            duplicate_related_song_id in any::<i32>(),
            other_related_song_ids in prop::collection::btree_set(any::<i32>(), 0..16),
        ) {
            let song = new_song(Some(
                other_related_song_ids
                    .into_iter()
                    .filter(|related_song_id| {
                        *related_song_id != duplicate_related_song_id
                    })
                    .chain([duplicate_related_song_id, duplicate_related_song_id])
                    .map(new_relation)
                    .collect(),
            ));

            prop_assert!(has_error_kind(
                song.validate(None),
                &DuplicateRelatedSong,
            ));
        }

        #[test]
        fn validate_rejects_duplicate_related_songs(
            song_id in any::<i32>(),
            duplicate_related_song_id in any::<i32>(),
            other_related_song_ids in prop::collection::btree_set(any::<i32>(), 0..16),
        ) {
            prop_assume!(duplicate_related_song_id != song_id);

            let song = new_song(Some(
                other_related_song_ids
                    .into_iter()
                    .filter(|related_song_id| {
                        *related_song_id != song_id
                            && *related_song_id != duplicate_related_song_id
                    })
                    .chain([duplicate_related_song_id, duplicate_related_song_id])
                    .map(new_relation)
                    .collect(),
            ));

            prop_assert!(has_error_kind(
                song.validate(Some(song_id)),
                &DuplicateRelatedSong,
            ));
        }
    }

    fn new_song(relations: Option<Vec<NewSongRelation>>) -> NewSong {
        NewSong {
            title: EntityIdent::try_new("test song").unwrap_or_else(|_err| {
                panic!("test fixture title should be valid")
            }),
            artists: None,
            credits: None,
            languages: None,
            localized_titles: None,
            relations,
        }
    }

    fn new_relation(related_song_id: i32) -> NewSongRelation {
        NewSongRelation {
            related_song_id,
            relation_type_id: 1,
            description: "relation".to_string(),
        }
    }

    fn has_error_kind(
        result: Result<(), ValidationError>,
        expected: &ValidationErrorKind,
    ) -> bool {
        matches!(
            result,
            Err(ValidationError { source })
                if discriminant(&source) == discriminant(expected)
        )
    }
}
