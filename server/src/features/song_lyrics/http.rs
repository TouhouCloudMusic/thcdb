use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewSongLyrics;
use super::{find, service};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application::correction::{
    CorrectionSubmissionResult, NewCorrectionDto,
};
use crate::features::correction::SubmissionError;
use crate::shared::http::api_response::Data;

const TAG: &str = "Song Lyrics";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_song_lyrics))
                .routes(routes!(update_song_lyrics))
        })
        .finish();

    OpenApiRouter::new().merge(find::router()).merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song-lyrics",
    request_body = NewCorrectionDto<NewSongLyrics>,
    responses(
		(status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn create_song_lyrics(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Json(dto): Json<NewCorrectionDto<NewSongLyrics>>,
) -> Result<Data<CorrectionSubmissionResult>, SubmissionError> {
    let result = service::create(&repo, dto.with_author(user)).await?;

    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song-lyrics/{id}",
    request_body = NewCorrectionDto<NewSongLyrics>,
    responses(
		(status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn update_song_lyrics(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    State(notification): State<state::NotificationService>,
    Path(lyrics_id): Path<i32>,
    Json(input): Json<NewCorrectionDto<NewSongLyrics>>,
) -> Result<Data<CorrectionSubmissionResult>, SubmissionError> {
    let user_id = user.id;
    let result =
        service::upsert_correction(&repo, lyrics_id, input.with_author(user))
            .await?;

    notification
        .notify_correction_needs_review_best_effort(
            result.correction_id,
            &[user_id],
        )
        .await;

    Ok(Data::from(result))
}
