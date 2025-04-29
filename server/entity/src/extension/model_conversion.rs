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
            location_country: Set(value.location_country.clone()),
            location_province: Set(value.location_province.clone()),
            location_city: Set(value.location_city.clone()),
        }
    }
}

impl From<(i32, &release_history::Model)> for release::ActiveModel {
    fn from((id, model): (i32, &release_history::Model)) -> Self {
        Self {
            id: Set(id),
            title: Set(model.title.clone()),
            release_type: Set(model.release_type),
            release_date: Set(model.release_date),
            release_date_precision: Set(model.release_date_precision),
            recording_date_start: Set(model.recording_date_start),
            recording_date_start_precision: Set(
                model.recording_date_start_precision
            ),
            recording_date_end: Set(model.recording_date_end),
            recording_date_end_precision: Set(
                model.recording_date_end_precision
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
