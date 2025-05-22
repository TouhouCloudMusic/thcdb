use entity::enums::DatePrecision;
use entity::{release, release_history};
use sea_orm::ActiveValue::{NotSet, Set};

use crate::domain::release::NewRelease;

impl From<&NewRelease> for release::ActiveModel {
    fn from(value: &NewRelease) -> Self {
        Self {
            id: NotSet,
            title: Set(value.title.clone()),
            release_type: Set(value.release_type),
            release_date: Set(value.release_date.as_ref().map(|dp| dp.value)),
            release_date_precision: Set(value
                .release_date
                .as_ref()
                .map_or(DatePrecision::Day, |dp| dp.precision)),
            recording_date_start: Set(value
                .recording_start_date
                .as_ref()
                .map(|dp| dp.value)),
            recording_date_start_precision: Set(value
                .recording_start_date
                .as_ref()
                .map_or(DatePrecision::Day, |dp| dp.precision)),
            recording_date_end: Set(value
                .recording_end_date
                .as_ref()
                .map(|dp| dp.value)),
            recording_date_end_precision: Set(value
                .recording_end_date
                .as_ref()
                .map_or(DatePrecision::Day, |dp| dp.precision)),
        }
    }
}

impl From<&NewRelease> for release_history::ActiveModel {
    fn from(value: &NewRelease) -> Self {
        Self {
            id: NotSet,
            title: Set(value.title.clone()),
            release_type: Set(value.release_type),
            release_date: Set(value.release_date.as_ref().map(|dp| dp.value)),
            release_date_precision: Set(value
                .release_date
                .as_ref()
                .map_or(DatePrecision::Day, |dp| dp.precision)),
            recording_date_start: Set(value
                .recording_start_date
                .as_ref()
                .map(|dp| dp.value)),
            recording_date_start_precision: Set(value
                .recording_start_date
                .as_ref()
                .map_or(DatePrecision::Day, |dp| dp.precision)),
            recording_date_end: Set(value
                .recording_end_date
                .as_ref()
                .map(|dp| dp.value)),
            recording_date_end_precision: Set(value
                .recording_end_date
                .as_ref()
                .map_or(DatePrecision::Day, |dp| dp.precision)),
        }
    }
}
