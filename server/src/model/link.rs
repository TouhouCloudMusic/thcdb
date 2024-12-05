use entity::link;
use entity::sea_orm_active_enums::MediaPlatform;
use sea_orm::ActiveValue::NotSet;
use sea_orm::{IntoActiveModel, Set};
use serde::Deserialize;

#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
pub struct New {
    pub platform: MediaPlatform,
    pub url: String,
}

impl IntoActiveModel<link::ActiveModel> for New {
    fn into_active_model(self) -> link::ActiveModel {
        link::ActiveModel {
            id: NotSet,
            platform: Set(self.platform),
            url: Set(self.url),
        }
    }
}
