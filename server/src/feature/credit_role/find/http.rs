use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, CommonFilter, FindManyFilter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::domain::credit_role::{CreditRole, CreditRoleSummary};
use crate::domain::query_kind;
use crate::infra::error::Error;

const TAG: &str = "Credit Role";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(find_many_credit_roles_summary))
        .routes(routes!(find_credit_role_by_id))
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
        Error
    )
)]
async fn find_many_credit_roles_summary(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<CreditRoleSummary>>, Error> {
    repo::find_many::<_, query_kind::Summary>(
        &repo,
        query.into(),
        CommonFilter {},
    )
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
        Error
    ),
)]
async fn find_credit_role_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    axum_extra::extract::Query(common): axum_extra::extract::Query<
        CommonFilter,
    >,
) -> Result<Data<Option<CreditRole>>, Error> {
    repo::find_one::<_, query_kind::Full>(&repo, id, common)
        .await
        .bimap_into()
}
