use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::{EntityType, Score, TagAggregate};
use super::{Error, repo};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState, AuthSession};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::domain::shared::Paginated;
use crate::shared::http::PaginationQuery;

const TAG: &str = "TagVote";

data!(DataPaginatedTagAggregate, Paginated<TagAggregate>);

#[derive(Deserialize, IntoParams)]
struct TagVotePath {
    #[param(inline)]
    entity_type: EntityType,
    id: i32,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(get_tags)))
        .with_private(|r| {
            r.routes(routes!(vote_tag)).routes(routes!(delete_vote))
        })
        .finish()
}

#[derive(Deserialize, ToSchema)]
struct VoteBody {
    tag_id: i32,
    score: Score,
}

#[derive(Deserialize, ToSchema)]
struct DeleteVoteBody {
    tag_id: i32,
}

#[utoipa::path(
    put,
    tag = TAG,
    path = "/{entity_type}/{id}/tag-vote",
    params(TagVotePath),
    request_body = VoteBody,
    responses(
        (status = 200, description = "Vote recorded"),
        (status = 404, description = "Entity or tag not found"),
    ),
)]
async fn vote_tag(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Path(TagVotePath { entity_type, id }): Path<TagVotePath>,
    Json(body): Json<VoteBody>,
) -> Result<(), Error> {
    repo::upsert(&repo, entity_type, id, body.tag_id, user.id, body.score)
        .await?;
    Ok(())
}

#[utoipa::path(
    delete,
    tag = TAG,
    path = "/{entity_type}/{id}/tag-vote",
    params(TagVotePath),
    request_body = DeleteVoteBody,
    responses(
        (status = 200, description = "Vote deleted"),
    ),
)]
async fn delete_vote(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Path(TagVotePath { entity_type, id }): Path<TagVotePath>,
    Json(body): Json<DeleteVoteBody>,
) -> Result<(), Error> {
    repo::delete(&repo, entity_type, id, body.tag_id, user.id).await?;
    Ok(())
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/{entity_type}/{id}/tags",
    params(TagVotePath, PaginationQuery),
    responses(
        (status = 200, body = DataPaginatedTagAggregate),
    ),
)]
async fn get_tags(
    session: AuthSession,
    State(repo): State<state::SeaOrmRepository>,
    Path(TagVotePath { entity_type, id }): Path<TagVotePath>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<Paginated<TagAggregate>>, Error> {
    let user_id = session.user.as_ref().map(|u| u.id);
    let tags = repo::get_tags(
        &repo,
        entity_type,
        id,
        user_id,
        pagination.cursor,
        pagination.limit(),
    )
    .await?;
    Ok(tags.into())
}
