use std::collections::BTreeSet;

use derive_more::Display;
use domain::credit_role::CreditRoleRef;
use domain::shared::{
    DateWithPrecision, EntityIdent, HttpUrl, Language, LocalizedTitle,
    NewLocalizedName, SimpleArtist,
};
use entity::enums::{EntityType, SongRelationType};
use rating_core::RatingSummary;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;
use crate::features::song_lyrics::model::SongLyrics;

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
    pub links: Vec<String>,
    pub relations: Vec<SongRelation>,
    pub lyrics: Vec<SongLyrics>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongDetail {
    #[serde(flatten)]
    pub song: Song,
    pub rating: RatingSummary,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRelease {
    pub id: i32,
    pub title: String,
    pub track_positions: Vec<ReleaseTrackPosition>,
    pub release_date: Option<DateWithPrecision>,
    pub cover_art_url: Option<String>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct ReleaseTrackPosition {
    pub disc_number: i32,
    pub track_number: Option<String>,
}

#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRef {
    pub id: i32,
    pub title: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongCredit {
    pub artist: SimpleArtist,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<CreditRoleRef>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRelationSummary {
    pub id: i32,
    pub title: String,
    pub artists: Vec<SimpleArtist>,
    pub release: Option<SongRelease>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRelation {
    pub song: SongRelationSummary,
    pub direction: SongRelationDirection,
    #[serde(rename = "type")]
    pub r#type: SongRelationType,
    pub description: String,
}

#[derive(
    Clone,
    Copy,
    Debug,
    Deserialize,
    Eq,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
    ToSchema,
)]
pub enum SongRelationDirection {
    Source,
    Derived,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSong {
    pub title: EntityIdent,
    pub artists: Option<Vec<i32>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<NewLocalizedName>>,
    pub links: Option<Vec<HttpUrl>>,
    pub relations: Option<Vec<NewSongRelation>>,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSongRelation {
    pub related_song_id: i32,
    pub direction: SongRelationDirection,
    pub relation_type: SongRelationType,
    pub description: String,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSongCredit {
    pub artist_id: i32,
    #[serde(default)]
    pub role_id: Option<i32>,
}

pub type ValidationError =
    crate::shared::error::ValidationError<ValidationErrorKind>;

#[derive(Debug, Display, derive_more::Error)]
pub enum ValidationErrorKind {
    #[display("Song relation cannot target the same song")]
    SelfRelation,
    #[display("Song relation cannot be duplicated")]
    DuplicateRelation,
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

        let mut relations_seen = BTreeSet::new();
        for relation in relations {
            if song_id.is_some_and(|id| id == relation.related_song_id) {
                return Err(SelfRelation.into());
            }

            if !relations_seen.insert((
                relation.related_song_id,
                relation.direction,
                relation.relation_type,
            )) {
                return Err(DuplicateRelation.into());
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
    mod validate {
        use anyhow::{Result, anyhow};
        use domain::shared::EntityIdent;

        use super::super::SongRelationDirection::{Derived, Source};
        use super::super::ValidationErrorKind::*;
        use super::super::{
            NewSong, NewSongRelation, SongRelationType, ValidationError,
        };

        #[test]
        fn accepts_missing_or_empty_relations() -> Result<()> {
            for relations in [None, Some(vec![])] {
                let song = new_song(relations)?;

                song.validate(None)?;
                song.validate(Some(10))?;
            }

            Ok(())
        }

        #[test]
        fn accepts_relations_that_differ_in_song_direction_or_type()
        -> Result<()> {
            let relations = [
                (20, Source, SongRelationType::Derived),
                (30, Source, SongRelationType::Derived),
                (20, Derived, SongRelationType::Derived),
                (20, Source, SongRelationType::Arrangement),
                (20, Derived, SongRelationType::Arrangement),
            ]
            .map(|(related_song_id, direction, relation_type)| {
                NewSongRelation {
                    related_song_id,
                    direction,
                    relation_type,
                    description: String::new(),
                }
            });
            let song = new_song(Some(relations.into()))?;

            song.validate(None)?;
            song.validate(Some(10))?;

            Ok(())
        }

        #[test]
        fn rejects_self_relations_when_editing() -> Result<()> {
            for direction in [Source, Derived] {
                let relations =
                    [20, 10].map(|related_song_id| NewSongRelation {
                        related_song_id,
                        direction,
                        relation_type: SongRelationType::Cover,
                        description: String::new(),
                    });
                let song = new_song(Some(relations.into()))?;

                assert!(matches!(
                    song.validate(Some(10)),
                    Err(ValidationError {
                        source: SelfRelation
                    })
                ));
            }

            Ok(())
        }

        #[test]
        fn rejects_duplicate_relations_even_when_descriptions_differ()
        -> Result<()> {
            let relations = [
                (20, "Original description"),
                (30, "Another relation"),
                (20, "Updated description"),
            ]
            .map(|(related_song_id, description)| NewSongRelation {
                related_song_id,
                direction: Source,
                relation_type: SongRelationType::Cover,
                description: description.to_owned(),
            });
            let song = new_song(Some(relations.into()))?;

            for song_id in [None, Some(10)] {
                assert!(matches!(
                    song.validate(song_id),
                    Err(ValidationError {
                        source: DuplicateRelation
                    })
                ));
            }

            Ok(())
        }

        fn new_song(
            relations: Option<Vec<NewSongRelation>>,
        ) -> Result<NewSong> {
            Ok(NewSong {
                title: EntityIdent::try_new("test song")
                    .map_err(|error| anyhow!("{error}"))?,
                artists: None,
                credits: None,
                languages: None,
                localized_titles: None,
                relations,
                links: None,
            })
        }
    }
}
