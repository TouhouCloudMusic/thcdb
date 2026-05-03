use axum::Json;
use axum::extract::{FromRef, Path, Query, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::error::Error;
use super::model::{CorrectionComment, CreateCorrectionCommentRequest};
use super::service::Service;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::domain::shared::CursorResponse;
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::{Data, Message};

const TAG: &str = "Correction";

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(find_comments)))
        .with_private(|r| {
            r.routes(routes!(create_comment))
                .routes(routes!(delete_comment))
        })
        .finish()
}

data! {
    DataCorrectionComment, CorrectionComment
    DataPaginatedCorrectionComment, CursorResponse<CorrectionComment>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/correction/{id}/comments",
    params(
        ("id" = i32, Path, description = "Correction id"),
        PaginationQuery
    ),
    responses(
        (status = 200, body = DataPaginatedCorrectionComment),
    ),
)]
async fn find_comments(
    Path(id): Path<i32>,
    Query(pagination): Query<PaginationQuery>,
    State(service): State<Service>,
) -> Result<Data<CursorResponse<CorrectionComment>>, Error> {
    let comments = service.list_comments(id, pagination).await?;
    Ok(Data::new(comments))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/correction/{id}/comments",
    params(
        ("id" = i32, Path, description = "Correction id"),
    ),
    request_body = CreateCorrectionCommentRequest,
    responses(
        (status = 200, body = DataCorrectionComment),
    ),
)]
async fn create_comment(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
    Json(req): Json<CreateCorrectionCommentRequest>,
) -> Result<Data<CorrectionComment>, Error> {
    let comment = service.create_comment(id, user.id, req).await?;
    Ok(Data::new(comment))
}

#[utoipa::path(
    delete,
    tag = TAG,
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
