use axum::Json;
use axum::extract::{FromRef, Path, Query, State};
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::error::Error;
use super::model::{
    CommentTarget, CreateEntityCommentRequest, EntityComment, EntityCommentPage,
};
use super::service::Service;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::{Data, Message};

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(find_entity_comments)))
        .with_private(|r| {
            r.routes(routes!(create_entity_comment))
                .routes(routes!(delete_comment))
        })
        .finish()
}

data! {
    DataEntityComment, EntityComment
    DataPaginatedEntityComment, EntityCommentPage
}

#[derive(Clone, Copy, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum EntityCommentTarget {
    Artist,
    Release,
    Song,
    Label,
    Event,
    Tag,
}

impl From<EntityCommentTarget> for CommentTarget {
    fn from(value: EntityCommentTarget) -> Self {
        match value {
            EntityCommentTarget::Artist => Self::Artist,
            EntityCommentTarget::Release => Self::Release,
            EntityCommentTarget::Song => Self::Song,
            EntityCommentTarget::Label => Self::Label,
            EntityCommentTarget::Event => Self::Event,
            EntityCommentTarget::Tag => Self::Tag,
        }
    }
}

#[utoipa::path(
    get,
    tag = "Comment",
    path = "/{target_type}/{id}/comments",
    params(
        ("target_type" = EntityCommentTarget, Path, description = "Comment target type"),
        ("id" = i32, Path, description = "Target id"),
        PaginationQuery
    ),
    responses(
        (status = 200, body = DataPaginatedEntityComment),
    ),
)]
async fn find_entity_comments(
    Path((target, id)): Path<(EntityCommentTarget, i32)>,
    Query(pagination): Query<PaginationQuery>,
    State(service): State<Service>,
) -> Result<Data<EntityCommentPage>, Error> {
    let comments = service
        .list_comments(target.into(), id, pagination.into())
        .await?;
    Ok(Data::new(comments))
}

#[utoipa::path(
    post,
    tag = "Comment",
    path = "/{target_type}/{id}/comments",
    params(
        ("target_type" = EntityCommentTarget, Path, description = "Comment target type"),
        ("id" = i32, Path, description = "Target id"),
    ),
    request_body = CreateEntityCommentRequest,
    responses(
        (status = 200, body = DataEntityComment),
    ),
)]
async fn create_entity_comment(
    CurrentUser(user): CurrentUser,
    Path((target, id)): Path<(EntityCommentTarget, i32)>,
    State(service): State<Service>,
    Json(req): Json<CreateEntityCommentRequest>,
) -> Result<Data<EntityComment>, Error> {
    let comment = service
        .create_comment(target.into(), id, user.id, req)
        .await?;
    Ok(Data::new(comment))
}

#[utoipa::path(
    delete,
    tag = "Comment",
    path = "/comment/{id}",
    params(
        ("id" = i32, Path, description = "Comment id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn delete_comment(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Message, Error> {
    service.delete_comment(user.id, id).await?;
    Ok(Message::ok())
}
