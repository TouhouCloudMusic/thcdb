use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, SeaOrmTxRepo, {self},
};
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::{
    Message, {self},
};
use crate::application;
use crate::domain::TransactionManager;
use crate::domain::correction::ApproveCorrectionContext;
use crate::infra::error::Error;

const TAG: &str = "Correction";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(handle_correction)))
        .finish()
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
        .map_err(Error::from)
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
    type ArtistRepo = Self;
    type ReleaseRepo = Self;
    type SongRepo = Self;
    type LabelRepo = Self;
    type EventRepo = Self;
    type TagRepo = Self;
    type SongLyricsRepo = Self;
    type CreditRoleRepo = Self;

    fn artist_repo(self) -> Self::ArtistRepo {
        self
    }

    fn release_repo(self) -> Self::ReleaseRepo {
        self
    }

    fn song_repo(self) -> Self::SongRepo {
        self
    }

    fn label_repo(self) -> Self::LabelRepo {
        self
    }

    fn event_repo(self) -> Self::EventRepo {
        self
    }

    fn tag_repo(self) -> Self::TagRepo {
        self
    }

    fn song_lyrics_repo(self) -> Self::SongLyricsRepo {
        self
    }

    fn credit_role_repo(self) -> Self::CreditRoleRepo {
        self
    }
}
