use axum::Json;
use axum::extract::{Path, State};
use rating_core::{
    ErrorKind, Rating, RatingSummary, RatingTarget, RatingTargetKind,
};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::shared::http::api_response::{AppError, Data};

const TAG: &str = "Rating";

#[derive(Deserialize, IntoParams)]
struct RatingTargetParams {
    #[param(inline)]
    target_type: RatingTargetKind,
    id: i32,
}

#[derive(Deserialize, ToSchema)]
struct SetRatingRequest {
    #[serde(deserialize_with = "Option::deserialize")]
    #[schema(required = true)]
    rating: Option<Rating>,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(set_rating)))
        .finish()
}

#[utoipa::path(
    put,
    tag = TAG,
    path = "/{target_type}/{id}/rating",
    params(RatingTargetParams),
    request_body = SetRatingRequest,
    responses(
        (status = 200, description = "Rating updated", body = Data<RatingSummary>),
        (status = 404, description = "Rating target not found"),
    ),
)]
async fn set_rating(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Path(RatingTargetParams { target_type, id }): Path<RatingTargetParams>,
    Json(body): Json<SetRatingRequest>,
) -> Result<Data<RatingSummary>, AppError> {
    let target = RatingTarget {
        kind: target_type,
        id,
    };

    match body.rating {
        Some(rating) => {
            rating_core::set(&repo.conn, target, user.id, rating).await
        }
        None => rating_core::delete(&repo.conn, target, user.id).await,
    }
    .map_err(AppError::from)?;

    let summary = rating_core::get(&repo.conn, target, Some(user.id)).await?;

    Ok(Data::from(summary))
}

impl From<rating_core::Error> for AppError {
    fn from(error: rating_core::Error) -> Self {
        match error.kind() {
            ErrorKind::NotFound => Self::not_found(error.to_string()),
            ErrorKind::Internal => Self::internal(error),
        }
    }
}
