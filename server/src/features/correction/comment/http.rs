use axum::Json;
use axum::extract::{Path, Query, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::domain::shared::CursorResponse;
use crate::features::comment::{
    CommentTarget, CorrectionComment, CreateEntityCommentRequest, Error,
    Service,
};
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::Data;

const TAG: &str = "Correction";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(find_comments)))
        .with_private(|r| r.routes(routes!(create_comment)))
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
    let comments = CursorResponse::from(
        service
            .list_comments(CommentTarget::Correction, id, pagination.into())
            .await?,
    )
    .map(|comment| CorrectionComment::from_entity(id, comment));
    Ok(Data::new(comments))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/correction/{id}/comments",
    params(
        ("id" = i32, Path, description = "Correction id"),
    ),
    request_body = CreateEntityCommentRequest,
    responses(
        (status = 200, body = DataCorrectionComment),
    ),
)]
async fn create_comment(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
    Json(req): Json<CreateEntityCommentRequest>,
) -> Result<Data<CorrectionComment>, Error> {
    let comment = service
        .create_comment(CommentTarget::Correction, id, user.id, req)
        .await?;
    Ok(Data::new(CorrectionComment::from_entity(id, comment)))
}
