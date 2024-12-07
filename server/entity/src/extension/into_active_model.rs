use sea_orm::ActiveValue::*;
use sea_orm::IntoActiveModel;

use crate::{song, song_history};

impl IntoActiveModel<song_history::ActiveModel> for &song::Model {
    fn into_active_model(self) -> song_history::ActiveModel {
        song_history::ActiveModel {
            id: NotSet,
            title: Set(self.title.clone()),
            created_at: NotSet,
            updated_at: NotSet,
        }
    }
}
