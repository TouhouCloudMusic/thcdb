use entity::release_image_queue as db;
use infra_db::SeaOrmTxRepo;
use sea_orm::{EntityTrait, IntoActiveModel};

use super::model::ReleaseImageQueue;
use crate::infra::database::error::DatabaseError;

#[infra_db::observe("release_image.create")]
pub(crate) async fn create(
    repo: &SeaOrmTxRepo,
    queue: ReleaseImageQueue,
) -> Result<ReleaseImageQueue, DatabaseError> {
    let queue = db::Entity::insert(db::Model::from(queue).into_active_model())
        .exec_with_returning(repo.conn())
        .await?;
    Ok(queue.into())
}
