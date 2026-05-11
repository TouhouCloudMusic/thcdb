use axum::Json;
use axum::extract::{FromRef, Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::{
    CreateUserCollectionItemRequest, ReorderUserCollectionItemsRequest,
    UserCollection, UserCollectionItem, UserCollectionItemDetail,
    UserCollectionMutationRequest,
};
use super::service::Service;
use crate::adapter::inbound::rest::state::{
    ArcAppState, AuthSession, AuthSessionExt,
};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::domain::shared::{NonEmptyString, PageResponse};
use crate::shared::http::PageQuery;
use crate::shared::http::api_response::{AppError, Data, Message};

const TAG: &str = "User Collection";

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(user_collections))
                .routes(routes!(user_collection_detail))
                .routes(routes!(user_collection_items))
                .routes(routes!(public_user_collections))
                .routes(routes!(search_user_collections))
        })
        .with_private(|r| {
            r.routes(routes!(create_user_collection))
                .routes(routes!(update_user_collection))
                .routes(routes!(delete_user_collection))
                .routes(routes!(create_user_collection_item))
                .routes(routes!(delete_user_collection_item))
                .routes(routes!(reorder_user_collection_items))
        })
        .finish()
}

data! {
    DataPageUserCollection, PageResponse<UserCollection>
    DataUserCollection, UserCollection
    DataPageUserCollectionItemDetail, PageResponse<UserCollectionItemDetail>
    DataUserCollectionItem, UserCollectionItem
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct SearchQuery {
    keyword: NonEmptyString,
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
) -> Result<Data<PageResponse<UserCollection>>, AppError> {
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
) -> Result<Data<UserCollection>, AppError> {
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
) -> Result<Data<PageResponse<UserCollectionItemDetail>>, AppError> {
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
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<UserCollection>>, AppError> {
    let page = service.list_public_user_collections(page_query).await?;
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
    Query(SearchQuery { keyword }): Query<SearchQuery>,
    Query(page_query): Query<PageQuery>,
    State(service): State<Service>,
) -> Result<Data<PageResponse<UserCollection>>, AppError> {
    let page = service
        .search_public_user_collections(keyword, page_query)
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
) -> Result<Data<UserCollection>, AppError> {
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
) -> Result<Data<UserCollection>, AppError> {
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
) -> Result<Message, AppError> {
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
) -> Result<Data<UserCollectionItem>, AppError> {
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
) -> Result<Message, AppError> {
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
) -> Result<Message, AppError> {
    service
        .reorder_user_collection_items(user.id, id, req)
        .await?;
    Ok(Message::ok())
}
