use sea_orm::ActiveValue::NotSet;
use sea_orm::IntoActiveValue;

use crate::{song, song_history};

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
