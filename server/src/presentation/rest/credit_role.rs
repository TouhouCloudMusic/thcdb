use axum::Json;
use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use crate::application::correction::NewCorrectionDto;
use crate::application::credit_role::{CreateError, UpsertCorrectionError};
use crate::domain::credit_role::repo::{CommonFilter, FindManyFilter};
use crate::domain::credit_role::*;
use crate::domain::query_kind;
use crate::infra::error::Error;
use crate::presentation::api_response::{Data, Message};
use crate::presentation::rest::state::{ArcAppState, CreditRoleService};

const TAG: &str = "Credit Role";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(find_many_credit_roles_summary))
        .routes(routes!(find_credit_role_by_id))
        .routes(routes!(create_credit_role))
        .routes(routes!(upsert_credit_role_correction))
}

super::data! {
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
    State(service): State<CreditRoleService>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<CreditRoleSummary>>, Error> {
    service
        .find_many_credit_roles::<query_kind::Summary>(
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
    State(service): State<CreditRoleService>,
    Path(id): Path<i32>,
    axum_extra::extract::Query(common): axum_extra::extract::Query<
        CommonFilter,
    >,
) -> Result<Data<Option<CreditRole>>, Error> {
    service
        .find_one::<query_kind::Full>(id, common)
        .await
        .bimap_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role",
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        CreateError
    ),
)]
async fn create_credit_role(
    CurrentUser(user): CurrentUser,
    State(service): State<CreditRoleService>,
    Json(input): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Message, CreateError> {
    service
        .create(input.with_author(user))
        .await
        .map(|()| Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role/{id}",
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Message),
        (status = 401),
        UpsertCorrectionError
    ),
)]
async fn upsert_credit_role_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<CreditRoleService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Message, UpsertCorrectionError> {
    service.upsert_correction(id, dto.with_author(user)).await?;

    Ok(Message::ok())
}
