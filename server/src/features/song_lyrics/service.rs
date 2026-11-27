use axum::extract::FromRef;
use infra_db::SeaOrmRepository;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::features::correction::{
    CorrectionSubmitResult, NewCorrection, NewCorrectionMeta, SubmissionError,
    service as correction_service,
};
use crate::features::song_lyrics::model::{EditSongLyrics, NewSongLyrics};
use crate::features::user_event::UserEventSender;
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
    user_events: UserEventSender,
}

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
            user_events: input.user_events.clone(),
        }
    }
}

impl Service {
    pub async fn create(
        &self,
        correction: NewCorrection<NewSongLyrics>,
    ) -> Result<CorrectionSubmitResult, SubmissionError> {
        correction.data.validate().map_err(|source| {
            SubmissionError::Validation(source.to_string())
        })?;

        let tx_repo =
            self.repo.begin_tx().await.map_err(DatabaseError::from)?;

        let lyrics = correction.data;
        let entity_id = song_lyrics_repo::create(
            tx_repo.conn(),
            lyrics.song_id,
            lyrics.language_id,
            &lyrics.content,
            lyrics.is_main,
        )
        .await?;
        let history_id = song_lyrics_repo::create_history(
            tx_repo.conn(),
            entity_id,
            &lyrics.content,
            lyrics.is_main,
        )
        .await?
        .ok_or(BrokenEntityReference {
            entity: "song lyrics",
            id: entity_id,
        })
        .db_context("resolve created song lyrics")?;

        let correction_id = correction_service::create(
            &tx_repo,
            NewCorrectionMeta::<NewSongLyrics> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                history_id,
                description: correction.description,
                phantom: std::marker::PhantomData,
            },
        )
        .await?;

        tx_repo.commit().await.map_err(DatabaseError::from)?;

        Ok(CorrectionSubmitResult::submitted(correction_id, entity_id))
    }

    pub async fn upsert_correction(
        &self,
        lyrics_id: i32,
        correction: NewCorrection<EditSongLyrics>,
        mode: correction_service::CorrectionUpsertMode,
    ) -> Result<CorrectionSubmitResult, SubmissionError> {
        correction.data.validate().map_err(|source| {
            SubmissionError::Validation(source.to_string())
        })?;

        let tx_repo =
            self.repo.begin_tx().await.map_err(DatabaseError::from)?;

        let history_id = song_lyrics_repo::create_history(
            tx_repo.conn(),
            lyrics_id,
            &correction.data.content,
            correction.data.is_main,
        )
        .await?
        .ok_or(SubmissionError::NotFound)?;

        let result = correction_service::upsert(
            tx_repo,
            NewCorrectionMeta::<EditSongLyrics> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id: lyrics_id,
                history_id,
                description: correction.description,
                phantom: std::marker::PhantomData,
            },
            mode,
        )
        .await?;

        Ok(result.publish_and_respond(lyrics_id, &self.user_events))
    }
}
