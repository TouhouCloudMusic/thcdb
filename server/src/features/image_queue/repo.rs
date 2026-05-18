use domain::image::Image;
use entity::image_queue as db;
use infra_db::SeaOrmTxRepo;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{EntityTrait, IntoActiveModel};

use crate::features::user::User;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Debug, Clone, Copy)]
pub(crate) struct NewImageQueue {
    image_id: i32,
    created_by: i32,
}

impl NewImageQueue {
    pub(crate) const fn new(user: &User, image: &Image) -> Self {
        Self {
            image_id: image.id,
            created_by: user.id,
        }
    }
}

pub(crate) async fn create(
    repo: &SeaOrmTxRepo,
    queue: NewImageQueue,
) -> Result<db::Model, DatabaseError> {
    db::Entity::insert(queue.into_active_model())
        .exec_with_returning(repo.conn())
        .await
        .db_operation("create image queue")
}

impl IntoActiveModel<db::ActiveModel> for NewImageQueue {
    fn into_active_model(self) -> db::ActiveModel {
        db::ActiveModel {
            id: NotSet,
            image_id: Set(Some(self.image_id)),
            status: NotSet,
            handled_at: NotSet,
            handled_by: NotSet,
            reverted_at: NotSet,
            reverted_by: NotSet,
            created_at: NotSet,
            created_by: Set(self.created_by),
        }
    }
}
