use std::collections::HashSet;

use domain::shared::{NonEmptyString, PageResponse};
use entity::enums::EntityType;
use entity::{
    user_collection as user_collection_entity,
    user_collection_item as user_collection_item_entity,
};
use infra_db::SeaOrmRepository;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use sea_query::{ExprTrait, Func, all, any};

use super::error::{Error, NotFound};
use super::model::{
    CreateUserCollectionItemRequest, EntityUserCollectionSort,
    FollowedUserCollection, ReorderUserCollectionItemsRequest, UserCollection,
    UserCollectionItem, UserCollectionItemDetail,
    UserCollectionMutationRequest,
};
use super::repo;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::PageQuery;

#[derive(Clone)]
pub(super) struct Service {
    repo: SeaOrmRepository,
    user_events: UserEventSender,
}

impl Service {
    pub(super) const fn new(
        repo: SeaOrmRepository,
        user_events: UserEventSender,
    ) -> Self {
        Self { repo, user_events }
    }

    pub(super) async fn list_user_collections(
        &self,
        username: NonEmptyString,
        viewer_id: Option<i32>,
        page_query: PageQuery,
    ) -> Result<PageResponse<UserCollection>, Error> {
        let user =
            repo::find_requested_user_by_name(&self.repo.conn, &username)
                .await?;

        let mut select = user_collection_entity::Entity::find()
            .filter(user_collection_entity::Column::UserId.eq(user.id));

        if viewer_id != Some(user.id) {
            select = select
                .filter(user_collection_entity::Column::IsPublic.eq(true));
        }

        repo::load_user_collections_page(
            &self.repo.conn,
            select,
            viewer_id,
            page_query,
        )
        .await
    }

    pub(super) async fn get_user_collection_detail(
        &self,
        collection_id: i32,
        viewer_id: Option<i32>,
    ) -> Result<UserCollection, Error> {
        let collection = repo::load_user_collection_detail(
            &self.repo.conn,
            collection_id,
            viewer_id,
        )
        .await?;
        if !collection.is_public && viewer_id != Some(collection.owner.id) {
            return Err(Error::NotFound(NotFound::Collection));
        }
        Ok(collection)
    }

    pub(super) async fn list_user_collection_items(
        &self,
        collection_id: i32,
        viewer_id: Option<i32>,
        page_query: PageQuery,
    ) -> Result<PageResponse<UserCollectionItemDetail>, Error> {
        repo::find_visible_user_collection(
            &self.repo.conn,
            collection_id,
            viewer_id,
        )
        .await?;
        repo::load_user_collection_items_page(
            &self.repo.conn,
            collection_id,
            page_query,
        )
        .await
    }

    pub(super) async fn list_public_user_collections(
        &self,
        viewer_id: Option<i32>,
        page_query: PageQuery,
    ) -> Result<PageResponse<UserCollection>, Error> {
        let select = user_collection_entity::Entity::find()
            .filter(user_collection_entity::Column::IsPublic.eq(true));
        repo::load_user_collections_page(
            &self.repo.conn,
            select,
            viewer_id,
            page_query,
        )
        .await
    }

    pub(super) async fn list_entity_user_collections(
        &self,
        entity_type: EntityType,
        entity_id: i32,
        viewer_id: Option<i32>,
        sort: EntityUserCollectionSort,
        page_query: PageQuery,
    ) -> Result<PageResponse<UserCollection>, Error> {
        repo::load_entity_user_collections_page(
            &self.repo.conn,
            entity_type,
            entity_id,
            viewer_id,
            sort,
            page_query,
        )
        .await
    }

    pub(super) async fn search_public_user_collections(
        &self,
        keyword: NonEmptyString,
        viewer_id: Option<i32>,
        page_query: PageQuery,
    ) -> Result<PageResponse<UserCollection>, Error> {
        let pattern = format!("%{}%", keyword.to_lowercase());
        let select = user_collection_entity::Entity::find().filter(all![
            user_collection_entity::Column::IsPublic.eq(true),
            any![
                Func::lower(user_collection_entity::Column::Name.into_expr(),)
                    .like(pattern.clone()),
                Func::lower(
                    user_collection_entity::Column::Description.into_expr(),
                )
                .like(pattern),
            ],
        ]);

        repo::load_user_collections_page(
            &self.repo.conn,
            select,
            viewer_id,
            page_query,
        )
        .await
    }

    pub(super) async fn create_user_collection(
        &self,
        owner_id: i32,
        req: UserCollectionMutationRequest,
    ) -> Result<UserCollection, Error> {
        let model =
            repo::insert_user_collection(&self.repo.conn, owner_id, &req)
                .await?;
        repo::load_user_collection_detail(
            &self.repo.conn,
            model.id,
            Some(owner_id),
        )
        .await
    }

    pub(super) async fn update_user_collection(
        &self,
        owner_id: i32,
        collection_id: i32,
        req: UserCollectionMutationRequest,
    ) -> Result<UserCollection, Error> {
        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin update user collection transaction")?;
        let conn = tx_repo.conn();

        let model = repo::lock_user_collection(conn, collection_id).await?;
        model.ensure_owned_by(owner_id)?;

        repo::update_user_collection(conn, model, &req).await?;

        let collection = repo::load_user_collection_detail(
            conn,
            collection_id,
            Some(owner_id),
        )
        .await?;

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        Ok(collection)
    }

    pub(super) async fn delete_user_collection(
        &self,
        owner_id: i32,
        collection_id: i32,
    ) -> Result<(), Error> {
        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin delete user collection transaction")?;
        let conn = tx_repo.conn();

        let collection =
            repo::lock_user_collection(conn, collection_id).await?;
        collection.ensure_owned_by(owner_id)?;

        repo::delete_user_collection(conn, collection_id).await?;

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        Ok(())
    }

    pub(super) async fn create_user_collection_item(
        &self,
        owner_id: i32,
        collection_id: i32,
        req: CreateUserCollectionItemRequest,
    ) -> Result<UserCollectionItem, Error> {
        let tx_repo =
            self.repo.begin_tx().await.db_operation(
                "begin create user collection item transaction",
            )?;
        let conn = tx_repo.conn();

        let collection =
            repo::lock_user_collection(conn, collection_id).await?;
        collection.ensure_owned_by(owner_id)?;

        repo::ensure_referenced_entity_exists(
            conn,
            req.entity_type,
            req.entity_id,
        )
        .await?;

        let item = repo::insert_user_collection_item(conn, collection_id, &req)
            .await?;

        let notification_recipients = if collection.is_public {
            Some(
                user_collection_notification::create_collection_item_added_notification(
                    conn,
                    owner_id,
                    collection_id,
                    item.id,
                )
                .await?,
            )
        } else {
            None
        };

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        if let Some(notification_recipients) = notification_recipients {
            self.user_events.publish(
                UserEvent::NotificationInboxUpdated,
                notification_recipients.user_ids,
            );
        }

        Ok(item.into())
    }

    pub(super) async fn delete_user_collection_item(
        &self,
        owner_id: i32,
        collection_id: i32,
        item_id: i32,
    ) -> Result<(), Error> {
        let tx_repo =
            self.repo.begin_tx().await.db_operation(
                "begin delete user collection item transaction",
            )?;
        let conn = tx_repo.conn();

        let collection =
            repo::lock_user_collection(conn, collection_id).await?;
        collection.ensure_owned_by(owner_id)?;

        repo::delete_user_collection_item(conn, collection_id, item_id).await?;

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        Ok(())
    }

    pub(super) async fn reorder_user_collection_items(
        &self,
        owner_id: i32,
        collection_id: i32,
        req: ReorderUserCollectionItemsRequest,
    ) -> Result<(), Error> {
        let tx_repo =
            self.repo.begin_tx().await.db_operation(
                "begin reorder user collection items transaction",
            )?;
        let conn = tx_repo.conn();

        let collection =
            repo::lock_user_collection(conn, collection_id).await?;
        collection.ensure_owned_by(owner_id)?;

        let items =
            repo::load_user_collection_items(conn, collection_id).await?;
        validate_reordered_item_ids(&items, &req.item_ids)?;

        repo::update_user_collection_item_order(
            conn,
            collection_id,
            &req.item_ids,
        )
        .await?;

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        Ok(())
    }

    pub(super) async fn follow_user_collection(
        &self,
        user_id: i32,
        collection_id: i32,
    ) -> Result<(), Error> {
        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin follow user collection transaction")?;
        let conn = tx_repo.conn();

        let collection =
            repo::lock_user_collection(conn, collection_id).await?;

        if !collection.is_public {
            return Err(Error::NotFound(NotFound::Collection));
        }
        if collection.user_id == user_id {
            return Err(Error::CannotFollowOwnCollection);
        }

        let inserted =
            repo::follow_user_collection(conn, user_id, collection_id).await?;
        let notification_recipients = if inserted {
            Some(
                user_collection_notification::create_collection_followed_notification(
                    conn,
                    user_id,
                    collection_id,
                )
                .await?,
            )
        } else {
            None
        };

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        if let Some(notification_recipients) = notification_recipients {
            self.user_events.publish(
                UserEvent::NotificationInboxUpdated,
                notification_recipients.user_ids,
            );
        }

        Ok(())
    }

    pub(super) async fn unfollow_user_collection(
        &self,
        user_id: i32,
        collection_id: i32,
    ) -> Result<(), Error> {
        repo::unfollow_user_collection(&self.repo.conn, user_id, collection_id)
            .await
    }

    pub(super) async fn list_followed_user_collections(
        &self,
        user_id: i32,
        page_query: PageQuery,
    ) -> Result<PageResponse<FollowedUserCollection>, Error> {
        repo::load_followed_user_collections_page(
            &self.repo.conn,
            user_id,
            page_query,
        )
        .await
    }
}

trait UserCollectionOwnershipExt {
    fn ensure_owned_by(&self, user_id: i32) -> Result<(), Error>;
}

impl UserCollectionOwnershipExt for user_collection_entity::Model {
    fn ensure_owned_by(&self, user_id: i32) -> Result<(), Error> {
        if self.user_id == user_id {
            Ok(())
        } else {
            Err(Error::CollectionAccessDenied)
        }
    }
}

fn validate_reordered_item_ids(
    current_items: &[user_collection_item_entity::Model],
    requested_ids: &[i32],
) -> Result<(), Error> {
    if requested_ids.len() != current_items.len() {
        return Err(Error::InvalidRequest(
            "Collection item ids must match the current collection items"
                .to_string(),
        ));
    }

    let valid_ids: HashSet<i32> =
        current_items.iter().map(|item| item.id).collect();
    let mut seen = HashSet::new();

    for &id in requested_ids {
        if !valid_ids.contains(&id) {
            return Err(Error::InvalidRequest(
                "Collection item ids must match the current collection items"
                    .to_string(),
            ));
        }
        if !seen.insert(id) {
            return Err(Error::InvalidRequest(
                "Collection item ids must be unique".to_string(),
            ));
        }
    }

    Ok(())
}
