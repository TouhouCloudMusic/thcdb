use std::sync::Arc;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use domain::shared::NonEmptyString;
use infra_db::SeaOrmRepository;
use tokio::sync::Barrier;

use super::model::{
    CreateUserCollectionItemRequest, ReorderUserCollectionItemsRequest,
    UserCollection, UserCollectionItem, UserCollectionItemEntityType,
    UserCollectionMutationRequest,
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

    let private_detail = service
        .get_user_collection_detail(private_collection.id, Some(viewer.id))
        .await;
    assert_eq!(
        private_detail.unwrap_err().into_response().status(),
        StatusCode::NOT_FOUND
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

    assert_eq!(positions, (0_i32..task_count as i32).collect::<Vec<_>>());
}
