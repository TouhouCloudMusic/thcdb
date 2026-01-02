use entity::release_image;
use libfp::FunctorExt;
use sea_orm::{EntityTrait, IntoActiveModel};
use snafu::ResultExt;

use super::SeaOrmTxRepo;
use crate::domain::release_image::{ReleaseImage, Repo};

impl Repo for SeaOrmTxRepo {
    async fn create(
        &self,
        image: ReleaseImage,
    ) -> Result<ReleaseImage, Box<dyn std::error::Error + Send + Sync>> {
        release_image::Entity::insert(
            release_image::Model::from(image).into_active_model(),
        )
        .exec_with_returning(self.conn())
        .await
        .fmap_into()
        .boxed()
    }
}
