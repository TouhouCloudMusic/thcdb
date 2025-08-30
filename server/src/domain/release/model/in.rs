use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{song, song_history};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Date;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::out::CatalogNumber;
use crate::domain::correction::CorrectionEntity;
use crate::domain::credit_role::CreditRoleRef;
use crate::domain::shared::model::{
    DateWithPrecision, LocalizedTitle, NewLocalizedTitle,
};
#[derive(Clone, Deserialize, ToSchema)]
pub struct NewRelease {
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<DateWithPrecision>,
    pub recording_start_date: Option<DateWithPrecision>,
    pub recording_end_date: Option<DateWithPrecision>,

    pub artists: Vec<i32>,
    pub catalog_nums: Vec<CatalogNumber>,
    pub credits: Vec<NewCredit>,
    pub events: Vec<i32>,
    pub localized_titles: Vec<NewLocalizedTitle>,
    pub tracks: Vec<NewTrack>,
}

impl CorrectionEntity for NewRelease {
    fn entity_type() -> entity::enums::EntityType {
        entity::enums::EntityType::Release
    }
}

#[derive(Clone, ToSchema, Deserialize)]
pub enum NewTrack {
    Linked(#[schema(inline)] Linked),
    Unlinked(#[schema(inline)] Unlinked),
}

macro_rules! inherit_track_base {
    ($name:ident { $($vis:vis $field:ident: $ftype:ty),* $(,)? }) => {
        #[serde_with::serde_as]
        #[derive(Clone, ToSchema, Deserialize)]
        pub struct $name {
            pub artists: Vec<i32>,
            pub track_number: Option<String>,
            pub duration: Option<i32>,
            $($vis $field: $ftype,)*
        }
    };
}

inherit_track_base!(Unlinked {
    pub display_title: String,
});

inherit_track_base!(Linked {
    pub song_id: i32,
    pub display_title: Option<String>,
});

impl From<&Unlinked> for song::ActiveModel {
    fn from(value: &Unlinked) -> Self {
        Self {
            id: NotSet,
            title: Set(value.display_title.clone()),
        }
    }
}

impl From<&Unlinked> for song_history::ActiveModel {
    fn from(value: &Unlinked) -> Self {
        Self {
            id: NotSet,
            title: Set(value.display_title.clone()),
        }
    }
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewCredit {
    pub artist_id: i32,
    pub role_id: i32,
    pub on: Option<Vec<i16>>,
}
