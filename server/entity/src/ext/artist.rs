use sea_orm::ActiveValue::Set;

use crate::{artist, artist_history};

impl From<(i32, &artist_history::Model)> for artist::ActiveModel {
    fn from((id, value): (i32, &artist_history::Model)) -> Self {
        Self {
            id: Set(id),
            name: Set(value.name.clone()),
            artist_type: Set(value.artist_type),
            text_alias: Set(value.text_alias.clone()),
            start_date: Set(value.start_date),
            start_date_precision: Set(value.start_date_precision),
            end_date: Set(value.end_date),
            end_date_precision: Set(value.end_date_precision),
            start_location_country: Set(value.start_location_country.clone()),
            start_location_province: Set(value.start_location_province.clone()),
            start_location_city: Set(value.start_location_city.clone()),
            current_location_country: Set(value
                .current_location_country
                .clone()),
            current_location_province: Set(value
                .current_location_province
                .clone()),
            current_location_city: Set(value.current_location_city.clone()),
        }
    }
}
