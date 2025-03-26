use sea_orm::IntoActiveModel;

use crate::domain;

impl IntoActiveModel<entity::image::ActiveModel>
    for domain::entity::image::NewImage
{
    fn into_active_model(self) -> entity::image::ActiveModel {
        self.into()
    }
}
