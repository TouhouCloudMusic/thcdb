use axum::Json;
use axum::extract::{FromRef, Path, Query, State};
use domain::shared::{NonEmptyString, PageResponse};
use entity::enums::EntityType;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::error::Error;
use super::model::{
    CreateUserCollectionItemRequest, EntityUserCollectionSort,
    FollowedUserCollection, ReorderUserCollectionItemsRequest, UserCollection,
    UserCollectionItem, UserCollectionItemDetail,
    UserCollectionMutationRequest,
};
use super::service::Service;
use crate::adapter::inbound::rest::state::{
    ArcAppState, AuthSession, AuthSessionExt,
};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::shared::http::PageQuery;
use crate::shared::http::api_response::{Data, Message};

const TAG: &str = "User Collection";

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone(), input.user_events.clone())
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(user_collections))
                .routes(routes!(user_collection_detail))
                .routes(routes!(user_collection_items))
                .routes(routes!(public_user_collections))
                .routes(routes!(entity_user_collections))
                .routes(routes!(search_user_collections))
        })
        .with_private(|r| {
            r.routes(routes!(create_user_collection))
                .routes(routes!(update_user_collection))
                .routes(routes!(delete_user_collection))
                .routes(routes!(create_user_collection_item))
                .routes(routes!(delete_user_collection_item))
                .routes(routes!(reorder_user_collection_items))
                .routes(routes!(follow_user_collection))
                .routes(routes!(unfollow_user_collection))
                .routes(routes!(followed_user_collections))
        })
        .finish()
}

data! {
    DataPageUserCollection, PageResponse<UserCollection>
    DataUserCollection, UserCollection
    DataPageFollowedUserCollection, PageResponse<FollowedUserCollection>
    DataPageUserCollectionItemDetail, PageResponse<UserCollectionItemDetail>
    DataUserCollectionItem, UserCollectionItem
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct SearchQuery {
    keyword: NonEmptyString,
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct EntityCollectionsQuery {
    #[serde(default = "default_entity_collection_sort")]
    sort_by: EntityUserCollectionSort,
}

#[derive(Clone, Copy, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum EntityUserCollectionTarget {
    Artist,
    Label,
    Release,
    Song,
    Tag,
    Event,
}

impl From<EntityUserCollectionTarget> for EntityType {
    fn from(value: EntityUserCollectionTarget) -> Self {
        match value {
            EntityUserCollectionTarget::Artist => Self::Artist,
            EntityUserCollectionTarget::Label => Self::Label,
            EntityUserCollectionTarget::Release => Self::Release,
            EntityUserCollectionTarget::Song => Self::Song,
            EntityUserCollectionTarget::Tag => Self::Tag,
            EntityUserCollectionTarget::Event => Self::Event,
        }
    }
}

const fn default_entity_collection_sort() -> EntityUserCollectionSort {
    EntityUserCollectionSort::CollectedAt
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/user/{username}/collections",
    params(
        ("username" = NonEmptyString, Path, description = "Username"),
        PageQuery
    ),
    responses(
        (status = 200, body = DataPageUserCollection),
    ),
)]
async fn user_collections(
    session: AuthSession,
    Path(username): Path<NonEmptyString>,
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<UserCollection>>, Error> {
    let page = service
        .list_user_collections(username, session.verified_user_id(), page_query)
        .await?;
    Ok(Data::new(page))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/collection/{id}",
    params(
        ("id" = i32, Path, description = "Collection id"),
    ),
    responses(
        (status = 200, body = DataUserCollection),
    ),
)]
async fn user_collection_detail(
    session: AuthSession,
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Data<UserCollection>, Error> {
    let collection = service
        .get_user_collection_detail(id, session.verified_user_id())
        .await?;
    Ok(Data::new(collection))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/collection/{id}/items",
    params(
        ("id" = i32, Path, description = "Collection id"),
        PageQuery
    ),
    responses(
        (status = 200, body = DataPageUserCollectionItemDetail),
    ),
)]
async fn user_collection_items(
    session: AuthSession,
    Path(id): Path<i32>,
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<UserCollectionItemDetail>>, Error> {
    let items = service
        .list_user_collection_items(id, session.verified_user_id(), page_query)
        .await?;
    Ok(Data::new(items))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/collections/public",
    params(PageQuery),
    responses(
        (status = 200, body = DataPageUserCollection),
    ),
)]
async fn public_user_collections(
    session: AuthSession,
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<UserCollection>>, Error> {
    let page = service
        .list_public_user_collections(session.verified_user_id(), page_query)
        .await?;
    Ok(Data::new(page))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/{entity_type}/{id}/collections",
    params(
        ("entity_type" = EntityUserCollectionTarget, Path, description = "Entity type"),
        ("id" = i32, Path, description = "Entity id"),
        EntityCollectionsQuery,
        PageQuery
    ),
    responses(
        (status = 200, body = DataPageUserCollection),
    ),
)]
async fn entity_user_collections(
    session: AuthSession,
    Path((entity_type, id)): Path<(EntityUserCollectionTarget, i32)>,
    Query(EntityCollectionsQuery { sort_by }): Query<EntityCollectionsQuery>,
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<UserCollection>>, Error> {
    let page = service
        .list_entity_user_collections(
            entity_type.into(),
            id,
            session.verified_user_id(),
            sort_by,
            page_query,
        )
        .await?;
    Ok(Data::new(page))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/collections/search",
    params(SearchQuery, PageQuery),
    responses(
        (status = 200, body = DataPageUserCollection),
    ),
)]
async fn search_user_collections(
    session: AuthSession,
    Query(SearchQuery { keyword }): Query<SearchQuery>,
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<UserCollection>>, Error> {
    let page = service
        .search_public_user_collections(
            keyword,
            session.verified_user_id(),
            page_query,
        )
        .await?;
    Ok(Data::new(page))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/user-collections/{id}/follow",
    params(
        ("id" = i32, Path, description = "Collection id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn follow_user_collection(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Message, Error> {
    service.follow_user_collection(user.id, id).await?;
    Ok(Message::ok())
}

#[utoipa::path(
    delete,
    tag = TAG,
    path = "/user-collections/{id}/follow",
    params(
        ("id" = i32, Path, description = "Collection id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn unfollow_user_collection(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Message, Error> {
    service.unfollow_user_collection(user.id, id).await?;
    Ok(Message::ok())
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/profile/followed-collections",
    params(PageQuery),
    responses(
        (status = 200, body = DataPageFollowedUserCollection),
    ),
)]
async fn followed_user_collections(
    CurrentUser(user): CurrentUser,
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<FollowedUserCollection>>, Error> {
    let page = service
        .list_followed_user_collections(user.id, page_query)
        .await?;
    Ok(Data::new(page))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/collection",
    request_body = UserCollectionMutationRequest,
    responses(
        (status = 200, body = DataUserCollection),
    ),
)]
async fn create_user_collection(
    CurrentUser(user): CurrentUser,
    State(service): State<Service>,
    Json(req): Json<UserCollectionMutationRequest>,
) -> Result<Data<UserCollection>, Error> {
    let collection = service.create_user_collection(user.id, req).await?;
    Ok(Data::new(collection))
}

#[utoipa::path(
    put,
    tag = TAG,
    path = "/collection/{id}",
    params(
        ("id" = i32, Path, description = "Collection id"),
    ),
    request_body = UserCollectionMutationRequest,
    responses(
        (status = 200, body = DataUserCollection),
    ),
)]
async fn update_user_collection(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
    Json(req): Json<UserCollectionMutationRequest>,
) -> Result<Data<UserCollection>, Error> {
    let collection = service.update_user_collection(user.id, id, req).await?;
    Ok(Data::new(collection))
}

#[utoipa::path(
    delete,
    tag = TAG,
    path = "/collection/{id}",
    params(
        ("id" = i32, Path, description = "Collection id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn delete_user_collection(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Message, Error> {
    service.delete_user_collection(user.id, id).await?;
    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/collection/{id}/items",
    params(
        ("id" = i32, Path, description = "Collection id"),
    ),
    request_body = CreateUserCollectionItemRequest,
    responses(
        (status = 200, body = DataUserCollectionItem),
    ),
)]
async fn create_user_collection_item(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
    Json(req): Json<CreateUserCollectionItemRequest>,
) -> Result<Data<UserCollectionItem>, Error> {
    let item = service
        .create_user_collection_item(user.id, id, req)
        .await?;
    Ok(Data::new(item))
}

#[utoipa::path(
    delete,
    tag = TAG,
    path = "/collection/{id}/items/{item_id}",
    params(
        ("id" = i32, Path, description = "Collection id"),
        ("item_id" = i32, Path, description = "Collection item id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn delete_user_collection_item(
    CurrentUser(user): CurrentUser,
    Path((id, item_id)): Path<(i32, i32)>,
    State(service): State<Service>,
) -> Result<Message, Error> {
    service
        .delete_user_collection_item(user.id, id, item_id)
        .await?;
    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/collection/{id}/items/reorder",
    params(
        ("id" = i32, Path, description = "Collection id"),
    ),
    request_body = ReorderUserCollectionItemsRequest,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn reorder_user_collection_items(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
    Json(req): Json<ReorderUserCollectionItemsRequest>,
) -> Result<Message, Error> {
    service
        .reorder_user_collection_items(user.id, id, req)
        .await?;
    Ok(Message::ok())
}
