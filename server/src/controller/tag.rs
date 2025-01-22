use axum::extract::State;
use axum::Json;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::dto::correction::Metadata;
use crate::dto::tag::NewTag;
use crate::error::GeneralRepositoryError;
use crate::service::tag::TagService;
use crate::state::AppState;
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(create_tag))
}

#[derive(ToSchema, Deserialize)]
struct CreateTagInput {
    #[serde(flatten)]
    pub data: NewTag,
    pub correction_data: Metadata,
}

#[utoipa::path(
    post,
    path = "/tag",
    request_body = CreateTagInput,
    responses(
		(status = 200, description = "Tag create successfully"),
		(status = 500, description = "Tag create failed"),
    ),
)]
async fn create_tag(
    State(service): State<TagService>,
    Json(input): Json<CreateTagInput>,
) -> Result<(), GeneralRepositoryError> {
    service.create(input.data, input.correction_data).await?;
    Ok(())
}
