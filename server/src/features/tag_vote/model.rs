use sea_orm::EntityName;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Copy, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub enum EntityType {
    Artist,
    Release,
    Song,
}

impl EntityType {
    pub fn vote_table_name(self) -> &'static str {
        match self {
            Self::Release => entity::release_tag_vote::Entity.table_name(),
            Self::Song => entity::song_tag_vote::Entity.table_name(),
            Self::Artist => entity::artist_tag_vote::Entity.table_name(),
        }
    }

    pub fn entity_id_column(self) -> &'static str {
        use sea_orm::IdenStatic;
        match self {
            Self::Release => {
                entity::release_tag_vote::Column::ReleaseId.as_str()
            }
            Self::Song => entity::song_tag_vote::Column::SongId.as_str(),
            Self::Artist => entity::artist_tag_vote::Column::ArtistId.as_str(),
        }
    }

    pub fn entity_table_name(self) -> &'static str {
        match self {
            Self::Release => entity::release::Entity.table_name(),
            Self::Song => entity::song::Entity.table_name(),
            Self::Artist => entity::artist::Entity.table_name(),
        }
    }

    pub const fn entity_name(self) -> &'static str {
        match self {
            Self::Release => "Release",
            Self::Song => "Song",
            Self::Artist => "Artist",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
pub enum Score {
    Veto = -3,
    Low = 1,
    Medium = 2,
    High = 3,
}

impl Score {
    pub const fn as_i16(self) -> i16 {
        self as i16
    }
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TagAggregateVote {
    pub user_name: String,
    pub score: i16,
}

#[serde_with::apply(
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option => #[serde(skip_serializing_if = "Option::is_none")]
)]
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TagAggregate {
    pub id: i32,
    pub name: String,
    pub short_description: String,
    pub count: i64,
    pub relevance: f64,
    pub user_vote: Option<i16>,
    pub votes: Vec<TagAggregateVote>,
}
