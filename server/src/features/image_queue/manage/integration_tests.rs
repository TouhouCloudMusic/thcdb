use anyhow::{Context, Result, anyhow};
use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::{ImageQueueStatus, ReleaseImageType};
use entity::{
    artist, artist_image, image, image_queue, release, release_image, user,
    user_role,
};
use image_queue_core::QueueTarget;
use infra_db::SeaOrmRepository;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};
use serde_json::json;

use super::ImageQueueAction;
use super::service::Service;
use crate::features::auth::UserRoleEnum;
use crate::features::user_event::UserEventSender;
use crate::infra::integration_test::fixture::{
    MockArtist, MockRelease, MockUser,
};
use crate::infra::integration_test::test_connection;

async fn insert_pending_queue(
    conn: &impl ConnectionTrait,
    user_id: i32,
    image_id: i32,
    target: QueueTarget,
) -> Result<image_queue::Model> {
    let (artist_id, release_id) = match target {
        QueueTarget::Artist(id) => (Some(id), None),
        QueueTarget::Release(id) => (None, Some(id)),
    };
    Ok(image_queue::Entity::insert(image_queue::ActiveModel {
        id: NotSet,
        image_id: Set(Some(image_id)),
        artist_id: Set(artist_id),
        release_id: Set(release_id),
        status: Set(ImageQueueStatus::Pending),
        handled_at: Set(None),
        handled_by: Set(None),
        reverted_at: Set(None),
        reverted_by: Set(None),
        created_at: NotSet,
        created_by: Set(user_id),
        description: NotSet,
    })
    .exec_with_returning(conn)
    .await?)
}

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
    let artist = MockArtist::named("reject pending queue artist")
        .insert(&conn)
        .await?;
    let queue = insert_pending_queue(
        &conn,
        user.id,
        image.id,
        QueueTarget::Artist(artist.id),
    )
    .await?;

    let repository = SeaOrmRepository::new(conn.clone());
    let service = Service::new(repository, UserEventSender::new(16));
    let detail = service
        .image_queue_detail(None, queue.id)
        .await
        .map_err(|error| anyhow!("load legacy image queue: {error:?}"))?;
    assert_eq!(
        serde_json::to_value(detail)?.get("description"),
        Some(&serde_json::Value::Null)
    );

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
    artist::Entity::delete_by_id(artist.id).exec(&conn).await?;
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
    let queue = insert_pending_queue(
        &conn,
        user.id,
        image.id,
        QueueTarget::Artist(artist.id),
    )
    .await?;

    let service = Service::new(
        SeaOrmRepository::new(conn.clone()),
        UserEventSender::new(16),
    );
    let detail = service
        .image_queue_detail(None, queue.id)
        .await
        .map_err(|error| anyhow!("load pending image queue: {error:?}"))?;
    assert_eq!(
        serde_json::to_value(detail)?["target"],
        json!({
            "kind": "artist",
            "id": artist.id,
            "name": artist.name,
            "current_image_url": null,
        })
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
    let detail = service
        .image_queue_detail(None, queue.id)
        .await
        .map_err(|error| anyhow!("load approved image queue: {error:?}"))?;
    assert_eq!(
        serde_json::to_value(detail)?["target"]["current_image_url"],
        image.object_key
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

#[tokio::test]
async fn release_detail_projects_latest_published_cover_not_queued_image()
-> Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("release_detail_cover")
        .insert(&conn)
        .await?;
    let release = MockRelease::titled("Release with published cover history")
        .insert(&conn)
        .await?;

    let mut images = Vec::new();
    for (index, day) in [2, 3, 1, 2].into_iter().enumerate() {
        let image = image::Entity::insert(image::ActiveModel {
            id: NotSet,
            uploaded_by: Set(user.id),
            uploaded_at: Set(format!("2025-01-0{day}T00:00:00Z").parse()?),
            backend: Set(StorageBackend::Fs),
            object_key: Set(format!(
                "release-detail-cover-{}-{index}",
                user.id
            )),
            unreferenced_since: Set(None),
        })
        .exec_with_returning(&conn)
        .await?;
        images.push(image);
    }
    let [tied_cover, queued_image, old_cover, current_cover] =
        images.as_slice()
    else {
        return Err(anyhow!("expected four test images"));
    };
    for cover in [tied_cover, current_cover, old_cover] {
        release_image::Entity::insert(release_image::ActiveModel {
            release_id: Set(release.id),
            image_id: Set(cover.id),
            r#type: Set(ReleaseImageType::Cover),
        })
        .exec(&conn)
        .await?;
    }
    let queue = insert_pending_queue(
        &conn,
        user.id,
        queued_image.id,
        QueueTarget::Release(release.id),
    )
    .await?;

    let service = Service::new(
        SeaOrmRepository::new(conn.clone()),
        UserEventSender::new(16),
    );
    let detail = service
        .image_queue_detail(None, queue.id)
        .await
        .map_err(|error| anyhow!("load release image queue: {error:?}"))?;
    let detail = serde_json::to_value(detail)?;
    assert_eq!(
        detail["target"],
        json!({
            "kind": "release",
            "id": release.id,
            "name": release.title,
            "current_image_url": current_cover.object_key,
        })
    );
    assert_eq!(detail["image"]["url"], queued_image.object_key);

    image_queue::Entity::delete_by_id(queue.id)
        .exec(&conn)
        .await?;
    release_image::Entity::delete_many()
        .filter(release_image::Column::ReleaseId.eq(release.id))
        .exec(&conn)
        .await?;
    release::Entity::delete_by_id(release.id)
        .exec(&conn)
        .await?;
    image::Entity::delete_many()
        .filter(image::Column::Id.is_in(images.iter().map(|image| image.id)))
        .exec(&conn)
        .await?;
    user::Entity::delete_by_id(user.id).exec(&conn).await?;
    Ok(())
}

#[tokio::test]
async fn queue_storage_rejects_missing_and_multiple_targets() -> Result<()> {
    let conn = test_connection().await?;
    let user = MockUser::with_label("detail_invalid_targets")
        .insert(&conn)
        .await?;
    let artist = MockArtist::named("Queue target artist")
        .insert(&conn)
        .await?;
    let release = MockRelease::titled("Queue target release")
        .insert(&conn)
        .await?;

    for (artist_id, release_id) in
        [(None, None), (Some(artist.id), Some(release.id))]
    {
        let error = image_queue::Entity::insert(image_queue::ActiveModel {
            artist_id: Set(artist_id),
            release_id: Set(release_id),
            created_by: Set(user.id),
            status: Set(ImageQueueStatus::Pending),
            ..Default::default()
        })
        .exec(&conn)
        .await
        .expect_err("invalid queue target accepted");
        assert!(
            error.to_string().contains("image_queue_exactly_one_target"),
            "{error}",
        );
    }

    release::Entity::delete_by_id(release.id)
        .exec(&conn)
        .await?;
    artist::Entity::delete_by_id(artist.id).exec(&conn).await?;
    user::Entity::delete_by_id(user.id).exec(&conn).await?;
    Ok(())
}
