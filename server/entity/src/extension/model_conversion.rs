use sea_orm::ActiveValue::{NotSet, Set};

use crate::{
    artist, artist_history, release, release_history, tag, tag_history,
};

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

impl From<&release_history::Model> for release::ActiveModel {
    fn from(value: &release_history::Model) -> Self {
        Self {
            id: NotSet,
            title: Set(value.title.clone()),
            release_type: Set(value.release_type),
            release_date: Set(value.release_date),
            release_date_precision: Set(value.release_date_precision),
            recording_date_start: Set(value.recording_date_start),
            recording_date_start_precision: Set(
                value.recording_date_start_precision
            ),
            recording_date_end: Set(value.recording_date_end),
            recording_date_end_precision: Set(
                value.recording_date_end_precision
            ),
        }
    }
}

impl From<&tag_history::Model> for tag::ActiveModel {
    fn from(value: &tag_history::Model) -> Self {
        Self {
            id: NotSet,
            name: Set(value.name.clone()),
            r#type: Set(value.r#type),
            short_description: Set(value.short_description.clone()),
            description: Set(value.description.clone()),
        }
    }
}
