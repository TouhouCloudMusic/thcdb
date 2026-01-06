use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, CommonFilter, FindManyFilter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::credit_role::model::{CreditRole, CreditRoleSummary};
use crate::infra::error::Error;

const TAG: &str = "Credit Role";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_many_credit_roles_summary))
                .routes(routes!(find_credit_role_by_id))
        })
        .finish()
}

data! {
    DataVecCreditRoleSummary, Vec<CreditRoleSummary>
    DataOptionCreditRole, Option<CreditRole>
}

#[derive(Deserialize, IntoParams)]
struct KwQuery {
    keyword: String,
}

impl From<KwQuery> for FindManyFilter {
    fn from(value: KwQuery) -> Self {
        Self::Name(value.keyword)
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/credit-role/summary",
    params(KwQuery),
    responses(
        (status = 200, body = DataVecCreditRoleSummary),
    )
)]
async fn find_many_credit_roles_summary(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<CreditRoleSummary>>, Error> {
    repo::find_many_summary(&repo, query.into(), CommonFilter {})
        .await
        .bimap_into()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/credit-role/{id}",
    params(
        CommonFilter
    ),
    responses(
        (status = 200, body = DataOptionCreditRole),
    ),
)]
async fn find_credit_role_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    axum_extra::extract::Query(common): axum_extra::extract::Query<
        CommonFilter,
    >,
) -> Result<Data<Option<CreditRole>>, Error> {
    repo::find_one(&repo, id, common).await.bimap_into()
}
