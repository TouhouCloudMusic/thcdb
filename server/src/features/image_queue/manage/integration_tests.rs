use anyhow::{Context, Result, anyhow};
use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::ImageQueueStatus;
use entity::{image, image_queue};
use infra_db::SeaOrmRepository;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;

use super::repo;
use crate::infra::integration_test::fixture::MockUser;
use crate::infra::integration_test::test_connection;

#[tokio::test]
async fn rejecting_pending_queue_preserves_image_reference() -> Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("reject_pending_queue")
        .insert(&conn)
        .await?;
    let image = image::Entity::insert(image::ActiveModel {
        id: NotSet,
        uploaded_by: Set(user.id),
        uploaded_at: NotSet,
        backend: Set(StorageBackend::Fs),
        object_key: Set("reject-pending-queue-image".to_owned()),
        unreferenced_since: Set(None),
    })
    .exec_with_returning(&conn)
    .await?;
    let queue = image_queue::Entity::insert(image_queue::ActiveModel {
        id: NotSet,
        image_id: Set(Some(image.id)),
        status: Set(ImageQueueStatus::Pending),
        handled_at: Set(None),
        handled_by: Set(None),
        reverted_at: Set(None),
        reverted_by: Set(None),
        created_at: NotSet,
        created_by: Set(user.id),
    })
    .exec_with_returning(&conn)
    .await?;

    let repository = SeaOrmRepository::new(conn.clone());
    let _notification_recipients = repo::reject(&repository, user.id, queue.id)
        .await
        .map_err(|error| anyhow!("reject image queue failed: {error:?}"))?;

    let queue = image_queue::Entity::find_by_id(queue.id)
        .one(&conn)
        .await?
        .context("rejected image queue entry disappeared")?;
    assert_eq!(queue.status, ImageQueueStatus::Rejected);
    assert_eq!(queue.image_id, Some(image.id));
    Ok(())
}
