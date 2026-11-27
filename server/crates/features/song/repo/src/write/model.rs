use std::collections::BTreeSet;

use derive_more::Display;
use domain::shared::{EntityIdent, HttpUrl, NewLocalizedName};
use entity::enums::SongRelationType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

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

#[derive(Debug, Display, derive_more::Error)]
pub enum ValidationError {
    #[display("Song relation cannot target the same song")]
    SelfRelation,
    #[display("Song relation cannot be duplicated")]
    DuplicateRelation,
}
use ValidationError::*;

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
                return Err(SelfRelation);
            }

            if !relations_seen.insert((
                relation.related_song_id,
                relation.direction,
                relation.relation_type,
            )) {
                return Err(DuplicateRelation);
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    mod validate {
        use anyhow::{Result, anyhow};
        use domain::shared::EntityIdent;

        use super::super::SongRelationDirection::{Derived, Source};
        use super::super::ValidationError::*;
        use super::super::{NewSong, NewSongRelation, SongRelationType};

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

                assert!(matches!(song.validate(Some(10)), Err(SelfRelation)));
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
                    Err(DuplicateRelation)
                ));
            }

            Ok(())
        }

        #[test]
        fn reports_the_first_invalid_relation() -> Result<()> {
            for related_ids in [[20, 20, 10], [20, 10, 20]] {
                let relations =
                    related_ids.map(|related_song_id| NewSongRelation {
                        related_song_id,
                        direction: Source,
                        relation_type: SongRelationType::Cover,
                        description: String::new(),
                    });
                let song = new_song(Some(relations.into()))?;

                assert!(matches!(
                    (song.validate(Some(10)), related_ids[1]),
                    (Err(DuplicateRelation), 20) | (Err(SelfRelation), 10)
                ));
            }

            Ok(())
        }
    }
}
