use anyhow::{Context, Result, anyhow};
use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::{ArtistImageType, ImageQueueStatus};
use entity::{
    artist, artist_image, artist_image_queue, image, image_queue, user,
    user_role,
};
use infra_db::SeaOrmRepository;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use super::ImageQueueAction;
use super::service::Service;
use crate::features::auth::UserRoleEnum;
use crate::features::user_event::UserEventSender;
use crate::infra::integration_test::fixture::{MockArtist, MockUser};
use crate::infra::integration_test::test_connection;

#[tokio::test]
async fn rejecting_pending_queue_preserves_image_reference() -> Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("reject_pending_queue")
        .insert(&conn)
        .await?;
    user_role::Entity::insert(user_role::ActiveModel {
        user_id: Set(user.id),
        role_id: Set(UserRoleEnum::Moderator.into()),
    })
    .exec(&conn)
    .await?;
    let image = image::Entity::insert(image::ActiveModel {
        id: NotSet,
        uploaded_by: Set(user.id),
        uploaded_at: NotSet,
        backend: Set(StorageBackend::Fs),
        object_key: Set(format!("reject-pending-queue-image-{}", user.id)),
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
    let service = Service::new(repository, UserEventSender::new(16));
    service
        .moderate_image_queue(user.id, queue.id, ImageQueueAction::Reject)
        .await
        .map_err(|error| anyhow!("reject image queue failed: {error:?}"))?;

    let queue = image_queue::Entity::find_by_id(queue.id)
        .one(&conn)
        .await?
        .context("rejected image queue entry disappeared")?;
    assert_eq!(queue.status, ImageQueueStatus::Rejected);
    assert_eq!(queue.image_id, Some(image.id));

    image_queue::Entity::delete_by_id(queue.id)
        .exec(&conn)
        .await?;
    image::Entity::delete_by_id(image.id).exec(&conn).await?;
    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.eq(user.id))
        .exec(&conn)
        .await?;
    user::Entity::delete_by_id(user.id).exec(&conn).await?;
    Ok(())
}

#[tokio::test]
async fn approving_and_reverting_a_queue_entry_publishes_and_removes_the_image()
-> Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("approve_revert_queue")
        .insert(&conn)
        .await?;
    user_role::Entity::insert(user_role::ActiveModel {
        user_id: Set(user.id),
        role_id: Set(UserRoleEnum::Moderator.into()),
    })
    .exec(&conn)
    .await?;
    let artist = MockArtist::named("approve revert queue artist")
        .insert(&conn)
        .await?;
    let image = image::Entity::insert(image::ActiveModel {
        id: NotSet,
        uploaded_by: Set(user.id),
        uploaded_at: NotSet,
        backend: Set(StorageBackend::Fs),
        object_key: Set(format!("approve-revert-queue-image-{}", user.id)),
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
    artist_image_queue::Entity::insert(artist_image_queue::ActiveModel {
        artist_id: Set(artist.id),
        queue_id: Set(queue.id),
        r#type: Set(ArtistImageType::Profile),
    })
    .exec(&conn)
    .await?;

    let service = Service::new(
        SeaOrmRepository::new(conn.clone()),
        UserEventSender::new(16),
    );
    service
        .moderate_image_queue(user.id, queue.id, ImageQueueAction::Approve)
        .await
        .map_err(|error| anyhow!("approve image queue failed: {error:?}"))?;
    let approved = image_queue::Entity::find_by_id(queue.id)
        .one(&conn)
        .await?
        .context("missing approved queue")?;
    assert_eq!(approved.status, ImageQueueStatus::Approved);
    assert!(
        artist_image::Entity::find_by_id((artist.id, image.id))
            .one(&conn)
            .await?
            .is_some()
    );

    service
        .moderate_image_queue(user.id, queue.id, ImageQueueAction::Revert)
        .await
        .map_err(|error| anyhow!("revert image queue failed: {error:?}"))?;
    let reverted = image_queue::Entity::find_by_id(queue.id)
        .one(&conn)
        .await?
        .context("missing reverted queue")?;
    assert_eq!(reverted.status, ImageQueueStatus::Reverted);
    assert!(
        artist_image::Entity::find_by_id((artist.id, image.id))
            .one(&conn)
            .await?
            .is_none()
    );

    artist_image_queue::Entity::delete_by_id((artist.id, queue.id))
        .exec(&conn)
        .await?;
    image_queue::Entity::delete_by_id(queue.id)
        .exec(&conn)
        .await?;
    image::Entity::delete_by_id(image.id).exec(&conn).await?;
    artist::Entity::delete_by_id(artist.id).exec(&conn).await?;
    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.eq(user.id))
        .exec(&conn)
        .await?;
    user::Entity::delete_by_id(user.id).exec(&conn).await?;
    Ok(())
}
