use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use entity::enums::EntityType;
use error_set::error_set;
use macros::EnumToResponse;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::{self, ArcAppState, SeaOrmTxRepo};
use crate::api_response::{self, Data, Message};
use crate::application;
use crate::domain::correction::{
    self, ApproveCorrectionContext, CorrectionFilter,
};
use crate::domain::repository::TransactionManager;
use crate::error::{ApiError, InfraError, ServiceError};

const TAG: &str = "Correction";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(handle_correction))
        .routes(routes!(pending_correction))
}

error_set! {
    #[derive(EnumToResponse)]
    Error = {
        Service(ServiceError),
        Api(ApiError)
    };
}

#[derive(ToSchema, Deserialize)]
pub enum HandleCorrectionMethod {
    Approve,
    Reject,
}

#[derive(IntoParams, Deserialize)]
struct HandleCorrectionQuery {
    method: HandleCorrectionMethod,
}

#[utoipa::path(
	post,
    tag = TAG,
	path = "/correction/{id}",
    params(
        HandleCorrectionQuery
    ),
	responses(
		(status = 200, body = Message),
		(status = 401),
		application::correction::Error
	),
)]
// TODO: Better name
async fn handle_correction(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Query(query): Query<HandleCorrectionQuery>,
    state: State<state::ArcAppState>,
    State(service): State<state::CorrectionService>,
) -> Result<Message, impl IntoResponse> {
    let tx_repo = state
        .sea_orm_repo
        .begin()
        .await
        .map_err(InfraError::from)
        .map_err(IntoResponse::into_response)?;

    match query.method {
        HandleCorrectionMethod::Approve => service
            .approve(id, user, tx_repo)
            .await
            .map_err(IntoResponse::into_response)
            .map(|()| Message::ok()),
        HandleCorrectionMethod::Reject => {
            Err(api_response::Error::new("Not implemented").into_response())
        }
    }
}

impl ApproveCorrectionContext for SeaOrmTxRepo {
    fn artist_repo(self) -> impl crate::domain::artist::TxRepo {
        self
    }

    fn release_repo(self) -> impl crate::domain::release::TxRepo {
        self
    }

    fn song_repo(self) -> impl crate::domain::song::TxRepo {
        self
    }

    fn label_repo(self) -> impl crate::domain::label::TxRepo {
        self
    }

    fn event_repo(self) -> impl crate::domain::event::TxRepo {
        self
    }

    fn tag_repo(self) -> impl crate::domain::tag::TxRepo {
        self
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
enum EntityTypePath {
    Artist,
    Label,
    Release,
    Song,
    Tag,
    Event,
}

impl From<EntityTypePath> for EntityType {
    fn from(value: EntityTypePath) -> Self {
        match value {
            EntityTypePath::Artist => Self::Artist,
            EntityTypePath::Label => Self::Label,
            EntityTypePath::Release => Self::Release,
            EntityTypePath::Song => Self::Song,
            EntityTypePath::Tag => Self::Tag,
            EntityTypePath::Event => Self::Event,
        }
    }
}

#[derive(Deserialize, IntoParams)]

struct PendingCorrectionPath {
    // https://github.com/scalar/scalar/issues/4309
    // External Bug: Not shown in docs if not inline
    // TODO: remove inline after bug fix
    #[param(inline)]
    entity_type: EntityTypePath,
    id: i32,
}

#[utoipa::path(
	get,
    tag = TAG,
	path = "/{entity_type}/{id}/pending-correction",
    params(PendingCorrectionPath),
	responses(
		(status = 200, body = Data<Option<i32>>),
		(status = 401),
		InfraError
	),
)]
async fn pending_correction(
    CurrentUser(_user): CurrentUser,
    Path(PendingCorrectionPath { entity_type, id }): Path<
        PendingCorrectionPath,
    >,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<Option<i32>>, InfraError> {
    Ok(correction::Repo::find_one(
        &repo,
        CorrectionFilter::pending(id, entity_type.into()),
    )
    .await?
    .map(|x| x.id)
    .into())
}
