use std::num::NonZeroU8;

use entity::{
    notification, notification_event, user, user_collection,
    user_collection_follow, user_role,
};
use infra_db::SeaOrmRepository;
use notification_service::{
    CollectionReference, NotificationBody, NotificationListQuery,
    NotificationState,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
use tokio::sync::broadcast::error::TryRecvError;

use super::{Error, NotFound, Service};
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::integration_test::fixture::MockUser;
use crate::infra::integration_test::test_connection;

#[tokio::test]
async fn private_collections_are_visible_only_to_the_owner()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let owner = MockUser::with_label("collection_owner")
        .insert(&conn)
        .await?;
    let viewer = MockUser::with_label("collection_viewer")
        .insert(&conn)
        .await?;
    let collection =
        user_collection::Entity::insert(user_collection::ActiveModel {
            id: NotSet,
            user_id: Set(owner.id),
            name: Set("private collection".to_owned()),
            description: Set(String::new()),
            is_public: Set(false),
        })
        .exec_with_returning(&conn)
        .await?;
    let service = Service::new(
        SeaOrmRepository::new(conn.clone()),
        UserEventSender::new(1),
    );
    let page_query = serde_json::from_str("{}")?;

    let hidden = service
        .list_user_collection_items(collection.id, Some(viewer.id), page_query)
        .await;
    assert!(matches!(hidden, Err(Error::NotFound(NotFound::Collection))));
    let page_query = serde_json::from_str("{}")?;
    let visible = service
        .list_user_collection_items(collection.id, Some(owner.id), page_query)
        .await;
    assert!(visible.is_ok());

    user_collection::Entity::delete_by_id(collection.id)
        .exec(&conn)
        .await?;
    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.is_in([owner.id, viewer.id]))
        .exec(&conn)
        .await?;
    user::Entity::delete_many()
        .filter(user::Column::Id.is_in([owner.id, viewer.id]))
        .exec(&conn)
        .await?;
    Ok(())
}

#[tokio::test]
async fn following_twice_creates_one_collection_follow_and_one_notification()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let owner = MockUser::with_label("collection_follow_owner")
        .insert(&conn)
        .await?;
    let follower = MockUser::with_label("collection_follower")
        .insert(&conn)
        .await?;
    let collection =
        user_collection::Entity::insert(user_collection::ActiveModel {
            id: NotSet,
            user_id: Set(owner.id),
            name: Set("followed collection".to_owned()),
            description: Set(String::new()),
            is_public: Set(true),
        })
        .exec_with_returning(&conn)
        .await?;
    let user_events = UserEventSender::new(4);
    let mut events = user_events.subscribe();
    let service =
        Service::new(SeaOrmRepository::new(conn.clone()), user_events);

    service
        .follow_user_collection(follower.id, collection.id)
        .await
        .map_err(|error| anyhow::anyhow!("initial follow failed: {error:?}"))?;
    service
        .follow_user_collection(follower.id, collection.id)
        .await
        .map_err(|error| {
            anyhow::anyhow!("repeated follow failed: {error:?}")
        })?;

    assert_eq!(
        user_collection_follow::Entity::find()
            .filter(user_collection_follow::Column::UserId.eq(follower.id))
            .filter(
                user_collection_follow::Column::CollectionId.eq(collection.id)
            )
            .count(&conn)
            .await?,
        1
    );
    let inbox =
        notification_service::Service::new(SeaOrmRepository::new(conn.clone()))
            .list_notifications(
                owner.id,
                NotificationListQuery {
                    state: NotificationState::Inbox,
                    category: None,
                },
                None,
                NonZeroU8::MIN,
            )
            .await?;
    assert_eq!(inbox.items.len(), 1);
    assert!(inbox.next_cursor.is_none());
    assert!(matches!(
        &inbox.items[0].body,
        NotificationBody::CollectionFollowed {
            actor,
            collection: CollectionReference::Available { id, .. },
        } if actor.id == follower.id && *id == collection.id
    ));
    let message = events.try_recv()?;
    assert_eq!(message.event, UserEvent::NotificationInboxUpdated);
    assert!(message.is_for(owner.id));
    assert!(!message.is_for(follower.id));
    assert!(matches!(events.try_recv(), Err(TryRecvError::Empty)));

    notification::Entity::delete_many()
        .filter(notification::Column::RecipientId.eq(owner.id))
        .exec(&conn)
        .await?;
    notification_event::Entity::delete_many()
        .filter(notification_event::Column::UserCollectionId.eq(collection.id))
        .exec(&conn)
        .await?;
    user_collection::Entity::delete_by_id(collection.id)
        .exec(&conn)
        .await?;
    user::Entity::delete_many()
        .filter(user::Column::Id.is_in([owner.id, follower.id]))
        .exec(&conn)
        .await?;
    Ok(())
}
