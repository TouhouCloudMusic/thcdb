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
