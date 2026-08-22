use chrono::{DateTime, FixedOffset};
use domain::shared::{DateWithPrecision, NonEmptyString, SimpleArtist};
use entity::enums::EntityType;
use entity::sea_orm_active_enums::{ArtistType, ReleaseType, TagType};
use entity::user_collection_item;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct UserCollectionOwner {
    pub id: i32,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct UserCollection {
    pub id: i32,
    pub owner: UserCollectionOwner,
    pub name: String,
    pub description: String,
    pub is_public: bool,
    pub item_count: u64,
    pub follower_count: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_following: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub followed_at: Option<DateTime<FixedOffset>>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct FollowedUserCollection {
    pub followed_at: DateTime<FixedOffset>,
    pub collection: UserCollection,
}

#[derive(Clone, Copy, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum EntityUserCollectionSort {
    CollectedAt,
    FollowerCount,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct UserCollectionItem {
    pub id: i32,
    pub entity_id: Option<i32>,
    pub entity_type: EntityType,
    pub description: Option<String>,
}

impl From<user_collection_item::Model> for UserCollectionItem {
    fn from(model: user_collection_item::Model) -> Self {
        Self {
            id: model.id,
            entity_id: model.entity_id,
            entity_type: model.entity_type,
            description: model.description,
        }
    }
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct ArtistSummary {
    pub id: i32,
    pub name: String,
    pub artist_type: ArtistType,
    pub profile_image_url: Option<String>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct ReleaseSummary {
    pub id: i32,
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<DateWithPrecision>,
    pub cover_art_url: Option<String>,
    pub artists: Vec<SimpleArtist>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongSummary {
    pub id: i32,
    pub title: String,
    pub artists: Vec<SimpleArtist>,
    pub cover_art_url: Option<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct TagSummary {
    pub id: i32,
    pub name: String,
    pub tag_type: TagType,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct EventSummary {
    pub id: i32,
    pub name: String,
    pub start_date: Option<DateWithPrecision>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct LabelSummary {
    pub id: i32,
    pub name: String,
}

/// Discriminated union of entity summaries, tagged by `entity_type`.
#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(tag = "entity_type")]
pub enum EntitySummary {
    Artist(ArtistSummary),
    Release(ReleaseSummary),
    Song(SongSummary),
    Tag(TagSummary),
    Event(EventSummary),
    Label(LabelSummary),
}

/// `UserCollectionItem` enriched with the referenced entity's summary data.
#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct UserCollectionItemDetail {
    pub id: i32,
    pub entity_id: Option<i32>,
    pub entity_type: EntityType,
    pub description: Option<String>,
    /// Resolved entity summary. `None` when `entity_id` is `None` or the
    /// referenced entity could not be found.
    pub entity: Option<EntitySummary>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UserCollectionMutationRequest {
    pub name: NonEmptyString,
    pub description: String,
    pub is_public: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateUserCollectionItemRequest {
    pub entity_id: i32,
    pub entity_type: UserCollectionItemEntityType,
    pub description: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, ToSchema)]
pub enum UserCollectionItemEntityType {
    Artist,
    Label,
    Release,
    Song,
    Tag,
    Event,
}

impl From<UserCollectionItemEntityType> for EntityType {
    fn from(value: UserCollectionItemEntityType) -> Self {
        match value {
            UserCollectionItemEntityType::Artist => Self::Artist,
            UserCollectionItemEntityType::Label => Self::Label,
            UserCollectionItemEntityType::Release => Self::Release,
            UserCollectionItemEntityType::Song => Self::Song,
            UserCollectionItemEntityType::Tag => Self::Tag,
            UserCollectionItemEntityType::Event => Self::Event,
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReorderUserCollectionItemsRequest {
    pub item_ids: Vec<i32>,
}
