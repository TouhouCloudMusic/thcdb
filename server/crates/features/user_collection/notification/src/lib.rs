use entity::{user_collection, user_collection_follow};
use infra_db::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};
use notification_core::{CreateNotificationsCommand, NotificationRecipients};
use sea_orm::sea_query::all;
use sea_orm::{
    ColumnTrait, DatabaseTransaction, EntityTrait, QueryFilter, QuerySelect,
};

/// Missing, private, and self-owned collections produce no recipients.
pub async fn create_collection_followed_notification(
    conn: &DatabaseTransaction,
    follower_id: i32,
    collection_id: i32,
) -> Result<NotificationRecipients, DatabaseError> {
    let Some(collection_owner_id) =
        user_collection::Entity::find_by_id(collection_id)
            .select_only()
            .column(user_collection::Column::UserId)
            .filter(all![
                user_collection::Column::IsPublic.eq(true),
                user_collection::Column::UserId.ne(follower_id),
            ])
            .into_tuple::<i32>()
            .one(conn)
            .await
            .db_operation("load followed collection owner")?
    else {
        return Ok(NotificationRecipients::default());
    };

    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::CollectionFollowed {
            actor_id: follower_id,
            recipient_id: collection_owner_id,
            collection_id,
        },
    )
    .await
}

pub async fn create_collection_item_added_notification(
    conn: &DatabaseTransaction,
    owner_id: i32,
    collection_id: i32,
    item_id: i32,
) -> Result<NotificationRecipients, DatabaseError> {
    let collection_exists = user_collection::Entity::find_by_id(collection_id)
        .select_only()
        .column(user_collection::Column::Id)
        .into_tuple::<i32>()
        .one(conn)
        .await
        .db_operation("load collection item notification collection")?
        .is_some();
    if !collection_exists {
        return Err(DatabaseError::broken_reference(BrokenEntityReference {
            entity: "user_collection",
            id: collection_id,
        }));
    }

    let recipients = user_collection_follow::Entity::find()
        .select_only()
        .column(user_collection_follow::Column::UserId)
        .filter(all![
            user_collection_follow::Column::CollectionId.eq(collection_id),
            user_collection_follow::Column::UserId.ne(owner_id),
        ])
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("resolve collection item notification recipients")?;

    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::CollectionItemAdded {
            actor_id: owner_id,
            recipients,
            collection_id,
            item_id,
        },
    )
    .await
}
