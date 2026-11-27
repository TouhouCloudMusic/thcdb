use std::collections::HashMap;

use entity::{image, image_queue};
use image_queue_core::{NamedQueueTarget, QueueTarget, load_targets};
use infra_db::SeaOrmRepository;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect};
use serde::Serialize;
pub(crate) use user_core::UserSummary;
use utoipa::ToSchema;

use super::ImageQueueType;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Serialize, ToSchema)]
pub(crate) struct ImageQueueListTarget {
    name: String,
    #[serde(rename = "type")]
    ty: ImageQueueType,
}

impl From<NamedQueueTarget> for ImageQueueListTarget {
    fn from(NamedQueueTarget { target, name }: NamedQueueTarget) -> Self {
        let ty = match target {
            QueueTarget::Artist(_) => ImageQueueType::Artist,
            QueueTarget::Release(_) => ImageQueueType::Release,
        };
        Self { name, ty }
    }
}

pub(super) struct ImageQueueListMetadata {
    images: HashMap<i32, String>,
    targets: HashMap<i32, NamedQueueTarget>,
}

impl ImageQueueListMetadata {
    pub(super) fn take(
        &mut self,
        queue: &image_queue::Model,
    ) -> (Option<String>, Option<ImageQueueListTarget>) {
        let image_url =
            queue.image_id.and_then(|id| self.images.get(&id)).cloned();
        let target = self.targets.remove(&queue.id).map(Into::into);
        (image_url, target)
    }
}

pub(super) async fn load_list_metadata(
    repo: &SeaOrmRepository,
    queues: &[image_queue::Model],
) -> Result<ImageQueueListMetadata, DatabaseError> {
    let queue_ids: Vec<_> = queues.iter().map(|queue| queue.id).collect();
    let targets = load_targets(&repo.conn, &queue_ids).await?;

    let image_ids: Vec<_> =
        queues.iter().filter_map(|queue| queue.image_id).collect();
    let images = if image_ids.is_empty() {
        HashMap::new()
    } else {
        image::Entity::find()
            .filter(image::Column::Id.is_in(image_ids))
            .select_only()
            .column(image::Column::Id)
            .column(image::Column::ObjectKey)
            .into_tuple::<(i32, String)>()
            .all(&repo.conn)
            .await
            .db_context("load queued image object keys")?
            .into_iter()
            .collect()
    };

    Ok(ImageQueueListMetadata { images, targets })
}
