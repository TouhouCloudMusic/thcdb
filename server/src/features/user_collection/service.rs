use std::collections::HashSet;

use domain::shared::{NonEmptyString, PageResponse};
use entity::enums::EntityType;
use entity::{
    user_collection as user_collection_entity,
    user_collection_item as user_collection_item_entity,
};
use infra_db::SeaOrmRepository;
use sea_orm::sea_query::{ExprTrait, Func};
use sea_orm::{ColumnTrait, Condition, EntityTrait, QueryFilter};

use super::error::{Error, NotFound};
use super::model::{
    CreateUserCollectionItemRequest, EntityUserCollectionSort,
    FollowedUserCollection, ReorderUserCollectionItemsRequest, UserCollection,
    UserCollectionItem, UserCollectionItemDetail,
    UserCollectionMutationRequest,
};
use super::repo;
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::PageQuery;

#[derive(Clone)]
pub(super) struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub(super) const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
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
        let select = user_collection_entity::Entity::find()
            .filter(user_collection_entity::Column::IsPublic.eq(true))
            .filter(
                Condition::any()
                    .add(
                        Func::lower(
                            user_collection_entity::Column::Name.into_expr(),
                        )
                        .like(pattern.clone()),
                    )
                    .add(
                        Func::lower(
                            user_collection_entity::Column::Description
                                .into_expr(),
                        )
                        .like(pattern),
                    ),
            );

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
        let model = repo::find_owned_user_collection(
            &self.repo.conn,
            collection_id,
            owner_id,
        )
        .await?;
        repo::update_user_collection(&self.repo.conn, model, &req).await?;
        repo::load_user_collection_detail(
            &self.repo.conn,
            collection_id,
            Some(owner_id),
        )
        .await
    }

    pub(super) async fn delete_user_collection(
        &self,
        owner_id: i32,
        collection_id: i32,
    ) -> Result<(), Error> {
        repo::find_owned_user_collection(
            &self.repo.conn,
            collection_id,
            owner_id,
        )
        .await?;
        repo::delete_user_collection(&self.repo.conn, collection_id).await
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
        repo::lock_owned_user_collection(conn, collection_id, owner_id).await?;
        repo::ensure_referenced_entity_exists(
            conn,
            req.entity_type,
            req.entity_id,
        )
        .await?;

        let position =
            repo::next_user_collection_item_position(conn, collection_id)
                .await?;
        let item = repo::insert_user_collection_item(
            conn,
            collection_id,
            &req,
            position,
        )
        .await?;

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

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
        repo::lock_owned_user_collection(conn, collection_id, owner_id).await?;
        repo::defer_user_collection_item_position_constraint(conn).await?;
        repo::delete_user_collection_item(conn, collection_id, item_id).await?;
        repo::resequence_user_collection_item_positions(conn, collection_id)
            .await?;

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
        repo::lock_owned_user_collection(conn, collection_id, owner_id).await?;
        repo::defer_user_collection_item_position_constraint(conn).await?;

        let items =
            repo::load_user_collection_items(conn, collection_id).await?;
        validate_reordered_item_ids(&items, &req.item_ids)?;

        let final_positions: Vec<(i32, i32)> =
            req.item_ids.iter().copied().zip(0_i32..).collect();
        repo::update_user_collection_item_positions(
            conn,
            collection_id,
            &final_positions,
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
        let collection = repo::find_visible_user_collection(
            &self.repo.conn,
            collection_id,
            Some(user_id),
        )
        .await?;

        if !collection.is_public {
            return Err(Error::NotFound(NotFound::Collection));
        }
        if collection.user_id == user_id {
            return Err(Error::InvalidRequest(
                "Cannot follow your own collection".to_string(),
            ));
        }

        repo::follow_user_collection(&self.repo.conn, user_id, collection_id)
            .await
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
