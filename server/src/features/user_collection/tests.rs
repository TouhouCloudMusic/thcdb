use std::sync::Arc;

use domain::shared::NonEmptyString;
use entity::enums::EntityType;
use infra_db::SeaOrmRepository;
use tokio::sync::Barrier;

use super::error::{Error, NotFound};
use super::model::{
    CreateUserCollectionItemRequest, EntityUserCollectionSort,
    ReorderUserCollectionItemsRequest, UserCollection, UserCollectionItem,
    UserCollectionItemEntityType, UserCollectionMutationRequest,
};
use super::service::Service;
use crate::infra::integration_test::fixture::{MockSong, MockUser};
use crate::infra::integration_test::test_connection;
use crate::shared::http::PageQuery;

fn page_query() -> PageQuery {
    serde_json::from_value(serde_json::json!({
        "page": 1,
        "limit": 20,
    }))
    .unwrap()
}

fn username(name: &str) -> NonEmptyString {
    serde_json::from_value(serde_json::json!(name)).unwrap()
}

async fn test_service() -> (sea_orm::DatabaseConnection, Service) {
    let conn = test_connection().await;
    let service = Service::new(SeaOrmRepository::new(conn.clone()));
    (conn, service)
}

async fn create_user_collection(
    service: &Service,
    owner_id: i32,
    name: &str,
    is_public: bool,
) -> UserCollection {
    service
        .create_user_collection(
            owner_id,
            UserCollectionMutationRequest {
                name: username(name),
                description: String::new(),
                is_public,
            },
        )
        .await
        .unwrap()
}

async fn create_song_item(
    service: &Service,
    owner_id: i32,
    collection_id: i32,
    song_id: i32,
    description: &str,
) -> UserCollectionItem {
    service
        .create_user_collection_item(
            owner_id,
            collection_id,
            CreateUserCollectionItemRequest {
                entity_id: song_id,
                entity_type: UserCollectionItemEntityType::Song,
                description: Some(description.to_string()),
            },
        )
        .await
        .unwrap()
}

async fn item_positions(
    service: &Service,
    collection_id: i32,
    viewer_id: i32,
) -> Vec<(i32, i32)> {
    service
        .list_user_collection_items(
            collection_id,
            Some(viewer_id),
            page_query(),
        )
        .await
        .unwrap()
        .items
        .into_iter()
        .map(|item| (item.id, item.position))
        .collect()
}

#[tokio::test]
async fn private_collections_are_visible_only_to_owner() {
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("user_collection_owner")
        .insert(&conn)
        .await
        .unwrap();
    let viewer = MockUser::with_label("user_collection_viewer")
        .insert(&conn)
        .await
        .unwrap();

    let public_collection =
        create_user_collection(&service, owner.id, "public", true).await;
    let private_collection =
        create_user_collection(&service, owner.id, "private", false).await;

    let owner_page = service
        .list_user_collections(
            username(&owner.name),
            Some(owner.id),
            page_query(),
        )
        .await
        .unwrap();
    assert_eq!(owner_page.items.len(), 2);

    let viewer_page = service
        .list_user_collections(
            username(&owner.name),
            Some(viewer.id),
            page_query(),
        )
        .await
        .unwrap();
    assert_eq!(viewer_page.items.len(), 1);
    assert_eq!(viewer_page.items[0].id, public_collection.id);
    assert_eq!(viewer_page.items[0].follower_count, 0);
    assert_eq!(viewer_page.items[0].is_following, Some(false));

    let private_detail = service
        .get_user_collection_detail(private_collection.id, Some(viewer.id))
        .await;
    assert!(matches!(
        private_detail,
        Err(Error::NotFound(NotFound::Collection))
    ));
}

#[tokio::test]
async fn follow_user_collection_is_idempotent_and_updates_summary() {
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("user_collection_follow_owner")
        .insert(&conn)
        .await
        .unwrap();
    let viewer = MockUser::with_label("user_collection_follow_viewer")
        .insert(&conn)
        .await
        .unwrap();
    let collection =
        create_user_collection(&service, owner.id, "public", true).await;

    service
        .follow_user_collection(viewer.id, collection.id)
        .await
        .unwrap();
    service
        .follow_user_collection(viewer.id, collection.id)
        .await
        .unwrap();

    let detail = service
        .get_user_collection_detail(collection.id, Some(viewer.id))
        .await
        .unwrap();
    assert_eq!(detail.follower_count, 1);
    assert_eq!(detail.is_following, Some(true));

    let followed = service
        .list_followed_user_collections(viewer.id, page_query())
        .await
        .unwrap();
    assert_eq!(followed.items.len(), 1);
    assert_eq!(followed.items[0].collection.id, collection.id);
    assert!(followed.items[0].collection.followed_at.is_some());

    service
        .unfollow_user_collection(viewer.id, collection.id)
        .await
        .unwrap();
    service
        .unfollow_user_collection(viewer.id, collection.id)
        .await
        .unwrap();

    let detail = service
        .get_user_collection_detail(collection.id, Some(viewer.id))
        .await
        .unwrap();
    assert_eq!(detail.follower_count, 0);
    assert_eq!(detail.is_following, Some(false));
}

#[tokio::test]
async fn follow_rejects_private_and_own_collections() {
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("user_collection_follow_reject_owner")
        .insert(&conn)
        .await
        .unwrap();
    let viewer = MockUser::with_label("user_collection_follow_reject_viewer")
        .insert(&conn)
        .await
        .unwrap();
    let private_collection =
        create_user_collection(&service, owner.id, "private", false).await;
    let own_collection =
        create_user_collection(&service, viewer.id, "own", true).await;

    let private_follow = service
        .follow_user_collection(viewer.id, private_collection.id)
        .await;
    assert!(matches!(
        private_follow,
        Err(Error::NotFound(NotFound::Collection))
    ));

    let own_follow = service
        .follow_user_collection(viewer.id, own_collection.id)
        .await;
    assert!(matches!(
        own_follow,
        Err(Error::InvalidRequest(message))
            if message == "Cannot follow your own collection"
    ));
}

#[tokio::test]
async fn entity_collections_include_public_collections_for_target_entity() {
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("entity_collection_owner")
        .insert(&conn)
        .await
        .unwrap();
    let viewer = MockUser::with_label("entity_collection_viewer")
        .insert(&conn)
        .await
        .unwrap();
    let song = MockSong::titled("entity-collection-song")
        .insert(&conn)
        .await
        .unwrap();
    let other_song = MockSong::titled("entity-collection-other-song")
        .insert(&conn)
        .await
        .unwrap();
    let public_collection =
        create_user_collection(&service, owner.id, "public", true).await;
    let private_collection =
        create_user_collection(&service, owner.id, "private", false).await;
    let unrelated_collection =
        create_user_collection(&service, owner.id, "unrelated", true).await;

    create_song_item(
        &service,
        owner.id,
        public_collection.id,
        song.id,
        "public",
    )
    .await;
    create_song_item(
        &service,
        owner.id,
        private_collection.id,
        song.id,
        "private",
    )
    .await;
    create_song_item(
        &service,
        owner.id,
        unrelated_collection.id,
        other_song.id,
        "other",
    )
    .await;

    let page = service
        .list_entity_user_collections(
            EntityType::Song,
            song.id,
            Some(viewer.id),
            EntityUserCollectionSort::CollectedAt,
            page_query(),
        )
        .await
        .unwrap();

    assert_eq!(page.total_items, 1);
    assert_eq!(page.items.len(), 1);
    assert_eq!(page.items[0].id, public_collection.id);

    let owner_page = service
        .list_entity_user_collections(
            EntityType::Song,
            song.id,
            Some(owner.id),
            EntityUserCollectionSort::CollectedAt,
            page_query(),
        )
        .await
        .unwrap();

    assert_eq!(owner_page.total_items, 2);
    assert_eq!(
        owner_page
            .items
            .iter()
            .map(|collection| collection.id)
            .collect::<Vec<_>>(),
        vec![private_collection.id, public_collection.id]
    );
}

#[tokio::test]
async fn entity_collections_sort_by_collected_at_and_follower_count() {
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("entity_collection_sort_owner")
        .insert(&conn)
        .await
        .unwrap();
    let first_follower =
        MockUser::with_label("entity_collection_sort_follower_one")
            .insert(&conn)
            .await
            .unwrap();
    let second_follower =
        MockUser::with_label("entity_collection_sort_follower_two")
            .insert(&conn)
            .await
            .unwrap();
    let song = MockSong::titled("entity-collection-sort-song")
        .insert(&conn)
        .await
        .unwrap();
    let older_collection =
        create_user_collection(&service, owner.id, "older", true).await;
    let newer_collection =
        create_user_collection(&service, owner.id, "newer", true).await;

    create_song_item(&service, owner.id, older_collection.id, song.id, "older")
        .await;
    create_song_item(&service, owner.id, newer_collection.id, song.id, "newer")
        .await;
    service
        .follow_user_collection(first_follower.id, older_collection.id)
        .await
        .unwrap();
    service
        .follow_user_collection(first_follower.id, newer_collection.id)
        .await
        .unwrap();
    service
        .follow_user_collection(second_follower.id, older_collection.id)
        .await
        .unwrap();

    let by_collected_at = service
        .list_entity_user_collections(
            EntityType::Song,
            song.id,
            Some(first_follower.id),
            EntityUserCollectionSort::CollectedAt,
            page_query(),
        )
        .await
        .unwrap();
    assert_eq!(
        by_collected_at
            .items
            .iter()
            .map(|collection| collection.id)
            .collect::<Vec<_>>(),
        vec![newer_collection.id, older_collection.id]
    );

    let by_follower_count = service
        .list_entity_user_collections(
            EntityType::Song,
            song.id,
            Some(first_follower.id),
            EntityUserCollectionSort::FollowerCount,
            page_query(),
        )
        .await
        .unwrap();
    assert_eq!(
        by_follower_count
            .items
            .iter()
            .map(|collection| collection.id)
            .collect::<Vec<_>>(),
        vec![older_collection.id, newer_collection.id]
    );
}

#[tokio::test]
async fn reorder_user_collection_items_updates_positions() {
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("user_collection_items")
        .insert(&conn)
        .await
        .unwrap();
    let first_song = MockSong::titled("first").insert(&conn).await.unwrap();
    let second_song = MockSong::titled("second").insert(&conn).await.unwrap();

    let collection =
        create_user_collection(&service, owner.id, "songs", true).await;

    let first_item = create_song_item(
        &service,
        owner.id,
        collection.id,
        first_song.id,
        "first",
    )
    .await;
    let second_item = create_song_item(
        &service,
        owner.id,
        collection.id,
        second_song.id,
        "second",
    )
    .await;

    service
        .reorder_user_collection_items(
            owner.id,
            collection.id,
            ReorderUserCollectionItemsRequest {
                item_ids: vec![second_item.id, first_item.id],
            },
        )
        .await
        .unwrap();

    assert_eq!(
        item_positions(&service, collection.id, owner.id).await,
        vec![(second_item.id, 0), (first_item.id, 1)]
    );
}

#[tokio::test]
async fn delete_user_collection_item_resequences_positions_after_front_delete()
{
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("user_collection_delete_resequence")
        .insert(&conn)
        .await
        .unwrap();
    let first_song = MockSong::titled("first").insert(&conn).await.unwrap();
    let second_song = MockSong::titled("second").insert(&conn).await.unwrap();
    let third_song = MockSong::titled("third").insert(&conn).await.unwrap();

    let collection =
        create_user_collection(&service, owner.id, "songs", true).await;

    let first_item = create_song_item(
        &service,
        owner.id,
        collection.id,
        first_song.id,
        "first",
    )
    .await;
    let second_item = create_song_item(
        &service,
        owner.id,
        collection.id,
        second_song.id,
        "second",
    )
    .await;
    let third_item = create_song_item(
        &service,
        owner.id,
        collection.id,
        third_song.id,
        "third",
    )
    .await;

    service
        .delete_user_collection_item(owner.id, collection.id, first_item.id)
        .await
        .unwrap();

    assert_eq!(
        item_positions(&service, collection.id, owner.id).await,
        vec![(second_item.id, 0), (third_item.id, 1)]
    );
}

#[tokio::test]
async fn concurrent_create_user_collection_items_keep_positions_unique() {
    let (conn, service) = test_service().await;
    let owner = MockUser::with_label("user_collection_item_concurrent_owner")
        .insert(&conn)
        .await
        .unwrap();
    let song = MockSong::titled("concurrent").insert(&conn).await.unwrap();
    let collection =
        create_user_collection(&service, owner.id, "songs", true).await;
    let owner_id = owner.id;
    let collection_id = collection.id;
    let song_id = song.id;

    let task_count = 8_usize;
    let barrier = Arc::new(Barrier::new(task_count));
    let mut handles = Vec::with_capacity(task_count);

    for index in 0..task_count {
        let service = service.clone();
        let barrier = Arc::clone(&barrier);
        let description = format!("item-{index}");

        handles.push(tokio::spawn(async move {
            barrier.wait().await;
            service
                .create_user_collection_item(
                    owner_id,
                    collection_id,
                    CreateUserCollectionItemRequest {
                        entity_id: song_id,
                        entity_type: UserCollectionItemEntityType::Song,
                        description: Some(description),
                    },
                )
                .await
        }));
    }

    for handle in handles {
        handle.await.unwrap().unwrap();
    }

    let positions = item_positions(&service, collection_id, owner_id)
        .await
        .into_iter()
        .map(|(_, position)| position)
        .collect::<Vec<_>>();

    let expected_positions = (0..task_count)
        .map(|position| i32::try_from(position).unwrap())
        .collect::<Vec<_>>();
    assert_eq!(positions, expected_positions);
}
