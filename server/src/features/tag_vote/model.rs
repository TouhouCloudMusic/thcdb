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

#[derive(Debug, Clone, Copy, PartialEq, Eq, ToSchema)]
#[schema(as = i16, example = 2)]
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

impl TryFrom<i16> for Score {
    type Error = InvalidScore;

    fn try_from(value: i16) -> Result<Self, Self::Error> {
        match value {
            -3 => Ok(Self::Veto),
            1 => Ok(Self::Low),
            2 => Ok(Self::Medium),
            3 => Ok(Self::High),
            _ => Err(InvalidScore),
        }
    }
}

impl<'de> Deserialize<'de> for Score {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = i16::deserialize(deserializer)?;
        Self::try_from(value).map_err(serde::de::Error::custom)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct InvalidScore;

impl std::fmt::Display for InvalidScore {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Invalid score, must be -3, 1, 2, or 3")
    }
}

impl std::error::Error for InvalidScore {}

#[derive(
    Debug,
    Clone,
    Serialize,
    ToSchema,
    sea_orm::FromQueryResult,
    macros::FieldEnum,
)]
pub struct TagAggregate {
    pub id: i32,
    pub name: String,
    pub count: i64,
    pub relevance: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_vote: Option<i16>,
}

impl sea_query::Iden for TagAggregateFieldName {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        s.write_str(self.as_str()).unwrap();
    }
}
