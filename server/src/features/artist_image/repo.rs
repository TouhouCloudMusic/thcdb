use entity::artist_image_queue as db;
use infra_db::SeaOrmTxRepo;
use sea_orm::{EntityTrait, IntoActiveModel};

use super::model::ArtistImageQueue;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(crate) async fn create(
    repo: &SeaOrmTxRepo,
    queue: ArtistImageQueue,
) -> Result<ArtistImageQueue, DatabaseError> {
    db::Entity::insert(db::Model::from(queue).into_active_model())
        .exec_with_returning(repo.conn())
        .await
        .db_operation("create artist image queue")
        .map(Into::into)
}
