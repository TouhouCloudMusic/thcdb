use sea_orm::ActiveValue::{self};

use crate::{release, release_history};

impl From<release::Model> for release_history::ActiveModel {
    fn from(value: release::Model) -> Self {
        let model = release_history::Model {
            id: value.id,
            title: value.title,
            release_type: value.release_type,
            release_date: value.release_date,
            release_date_precision: value.release_date_precision,
            recording_date_start: value.recording_date_start,
            recording_date_start_precision: value
                .recording_date_start_precision,
            recording_date_end: value.recording_date_end,
            recording_date_end_precision: value.recording_date_end_precision,
            created_at: value.created_at,
            updated_at: value.updated_at,
        };

        let mut active_model = Self { ..model.into() };

        active_model.created_at = ActiveValue::NotSet;
        active_model.updated_at = ActiveValue::NotSet;

        active_model
    }
}
