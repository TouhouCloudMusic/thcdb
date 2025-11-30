use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::domain::label::Label;
use crate::infra::error::Error;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_label_by_id))
                .routes(routes!(find_label_by_keyword))
        })
        .finish()
}

data! {
    DataOptionLabel, Option<Label>
    DataVecLabel, Vec<Label>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label/{id}",
    responses(
        (status = 200, body = DataOptionLabel),
    ),
)]
async fn find_label_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Label>>, Error> {
    super::repo::find_by_id(&repo, id).await.bimap_into()
}

#[derive(IntoParams, Deserialize)]
struct KwArgs {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label",
    params(KwArgs),
    responses(
        (status = 200, body = DataVecLabel),
    ),
)]
async fn find_label_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<Label>>, Error> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .bimap_into()
}
