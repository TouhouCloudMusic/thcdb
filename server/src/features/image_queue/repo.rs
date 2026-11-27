use domain::image::Image;
use entity::image_queue as db;
use image_queue_core::QueueTarget;
use infra_db::SeaOrmTxRepo;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{EntityTrait, IntoActiveModel};

use super::description::SubmissionDescription;
use crate::features::user::User;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Debug)]
pub(crate) struct NewImageQueue {
    image_id: i32,
    created_by: i32,
    target: QueueTarget,
    description: SubmissionDescription,
}

impl NewImageQueue {
    pub(crate) const fn new(
        user: &User,
        image: &Image,
        target: QueueTarget,
        description: SubmissionDescription,
    ) -> Self {
        Self {
            image_id: image.id,
            created_by: user.id,
            target,
            description,
        }
    }
}

impl IntoActiveModel<db::ActiveModel> for NewImageQueue {
    fn into_active_model(self) -> db::ActiveModel {
        let (artist_id, release_id) = match self.target {
            QueueTarget::Artist(id) => (Some(id), None),
            QueueTarget::Release(id) => (None, Some(id)),
        };
        db::ActiveModel {
            id: NotSet,
            image_id: Set(Some(self.image_id)),
            artist_id: Set(artist_id),
            release_id: Set(release_id),
            status: NotSet,
            handled_at: NotSet,
            handled_by: NotSet,
            reverted_at: NotSet,
            reverted_by: NotSet,
            created_at: NotSet,
            created_by: Set(self.created_by),
            description: Set(Some(self.description.into())),
        }
    }
}

#[infra_db::observe("image_queue.create")]
pub(crate) async fn create(
    repo: &SeaOrmTxRepo,
    queue: NewImageQueue,
) -> Result<db::Model, DatabaseError> {
    let model = db::Entity::insert(queue.into_active_model())
        .exec_with_returning(repo.conn())
        .await
        .db_context("create image queue")?;
    image_queue_core::subscribe(repo.conn(), model.created_by, model.id)
        .await
        .db_context("subscribe image queue creator")?;
    Ok(model)
}
