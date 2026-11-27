use axum::extract::{Path, Query, State};
use credit_role_repo::{CreditRole, CreditRoleSummary};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::Data;

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

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
struct CommonFilter {}

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
) -> Result<Data<Vec<CreditRoleSummary>>, DatabaseError> {
    Ok(
        credit_role_repo::find_many_summary(&repo.conn, &query.keyword)
            .await?
            .into(),
    )
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
    axum_extra::extract::Query(_common): axum_extra::extract::Query<
        CommonFilter,
    >,
) -> Result<Data<Option<CreditRole>>, DatabaseError> {
    Ok(credit_role_repo::find_by_id(&repo.conn, id).await?.into())
}
