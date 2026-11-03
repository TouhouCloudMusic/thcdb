use std::num::NonZeroU8;

use entity::{notification, notification_event, user, user_following};
use notification_service::{
    NotificationBody, NotificationListQuery, NotificationState,
};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
use tokio::sync::broadcast::error::TryRecvError;

use super::{
    FollowResult, SeaOrmRepository, Service, UserEvent, UserEventSender,
};
use crate::infra::integration_test::fixture::MockUser;
use crate::infra::integration_test::test_connection;

#[tokio::test]
async fn following_twice_creates_one_relationship_and_one_notification()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let follower = MockUser::with_label("follow_once_actor")
        .insert(&conn)
        .await?;
    let target = MockUser::with_label("follow_once_target")
        .insert(&conn)
        .await?;
    let user_events = UserEventSender::new(4);
    let mut events = user_events.subscribe();
    let service = Service {
        repo: SeaOrmRepository::new(conn.clone()),
        user_events,
    };

    assert_eq!(
        service.follow(follower.id, target.id).await?,
        FollowResult::Followed
    );
    assert_eq!(
        service.follow(follower.id, target.id).await?,
        FollowResult::AlreadyFollowing
    );
    assert_eq!(
        user_following::Entity::find()
            .filter(user_following::Column::UserId.eq(follower.id))
            .filter(user_following::Column::FollowingId.eq(target.id))
            .count(&conn)
            .await?,
        1
    );
    let inbox =
        notification_service::Service::new(SeaOrmRepository::new(conn.clone()))
            .list_notifications(
                target.id,
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
        NotificationBody::UserFollowed { actor } if actor.id == follower.id
    ));
    let message = events.try_recv()?;
    assert_eq!(message.event, UserEvent::NotificationInboxUpdated);
    assert!(message.is_for(target.id));
    assert!(!message.is_for(follower.id));
    assert!(matches!(events.try_recv(), Err(TryRecvError::Empty)));

    user_following::Entity::delete_many()
        .filter(user_following::Column::UserId.eq(follower.id))
        .exec(&conn)
        .await?;
    notification::Entity::delete_many()
        .filter(notification::Column::RecipientId.eq(target.id))
        .exec(&conn)
        .await?;
    notification_event::Entity::delete_many()
        .filter(notification_event::Column::ActorId.eq(follower.id))
        .exec(&conn)
        .await?;
    user::Entity::delete_many()
        .filter(user::Column::Id.is_in([follower.id, target.id]))
        .exec(&conn)
        .await?;
    Ok(())
}
