use entity::release_image;
use sea_orm::{EntityTrait, IntoActiveModel};

use super::SeaOrmTxRepo;
use crate::domain::release_image::{ReleaseImage, Repo};
use crate::domain::repository::Connection;
use crate::utils::MapInto;

impl Repo for SeaOrmTxRepo {
    async fn create(
        &self,
        image: ReleaseImage,
    ) -> Result<ReleaseImage, Self::Error> {
        release_image::Entity::insert(
            release_image::Model::from(image).into_active_model(),
        )
        .exec_with_returning(self.conn())
        .await
        .map_into()
    }
}
