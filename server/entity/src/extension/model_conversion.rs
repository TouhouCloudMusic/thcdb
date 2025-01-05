use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveValue;

use crate::{artist, artist_history, song, song_history};

impl From<&song::Model> for song_history::ActiveModel {
    fn from(value: &song::Model) -> Self {
        Self {
            id: NotSet,
            release_history_id: NotSet,
            title: value.title.clone().into_active_value(),
            duration: value.duration.clone().into_active_value(),
            track_number: value.track_number.clone().into_active_value(),
        }
    }
}

impl From<&artist_history::Model> for artist::ActiveModel {
    fn from(value: &artist_history::Model) -> Self {
        Self {
            id: NotSet,
            name: Set(value.name.clone()),
            artist_type: Set(value.artist_type),
            text_alias: Set(value.text_alias.clone()),
            start_date: Set(value.start_date),
            start_date_precision: Set(value.start_date_precision),
            end_date: Set(value.end_date),
            end_date_precision: Set(value.end_date_precision),
        }
    }
}
