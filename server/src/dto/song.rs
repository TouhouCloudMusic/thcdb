use entity::{song, song_credit, song_history};
use macros::impl_from;
use sea_orm::ActiveValue::{NotSet, Set};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::correction;
use super::share::{Language, NewLocalizedTitle, SimpleLocalizedTitle};

#[derive(ToSchema, Serialize)]
pub struct SongResponse {
    pub id: i32,
    pub title: String,

    #[schema(inline)]
    pub credits: Vec<SongCredit>,
    #[schema(inline)]
    pub languages: Vec<Language>,
    #[schema(inline)]
    pub localized_titles: Vec<SimpleLocalizedTitle>,
}

#[derive(ToSchema, Serialize)]
pub struct SongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}

impl_from!(song_credit::Model > SongCredit { artist_id, role_id });

#[derive(ToSchema, Deserialize)]
pub struct NewSong {
    pub title: String,
    pub languages: Option<Vec<i32>>,

    pub localized_titles: Option<Vec<NewLocalizedTitle>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub metadata: correction::Metadata,
}

impl_from!(
    NewSong >
    [song::ActiveModel, song_history::ActiveModel] {
        title,
        : id NotSet,
    },
    Set
);

#[derive(ToSchema, Deserialize)]
pub struct NewSongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}
