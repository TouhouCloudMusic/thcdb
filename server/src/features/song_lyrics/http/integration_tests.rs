use std::sync::Arc;

use anyhow::{Context, Result};
use axum::Router;
use axum::body::{Body, to_bytes};
use axum::http::{Request, StatusCode};
use entity::enums::{CorrectionStatus, CorrectionType, EntityType};
use entity::{
    correction, correction_revision, correction_subscription, song_lyrics,
    song_lyrics_history,
};
use infra_db::SeaOrmRepository;
use infra_testing::MockUser;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use serde_json::{Value, json};
use tower::ServiceExt;

use super::{ArcAppState, CurrentUser, router};
use crate::features::correction::{ModerationError, service};
use crate::features::song_lyrics::moderation::ApplyEditError;
use crate::features::user::User;
use crate::features::user_event::UserEventSender;
use crate::infra::integration_test::fixture::MockSong;
use crate::infra::integration_test::{test_connection, test_state};

const ENGLISH: i32 = 3;
const JAPANESE: i32 = 8;

async fn post(
    app: &Router,
    author: &CurrentUser,
    path: &str,
    kind: &str,
    data: Value,
    expected_status: StatusCode,
) -> Result<Value> {
    let response = app
        .clone()
        .oneshot(
            Request::post(path)
                .extension(author.clone())
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"data": data, "description": "", "type": kind})
                        .to_string(),
                ))?,
        )
        .await?;
    let status = response.status();
    let body = to_bytes(response.into_body(), 4096).await?;
    assert_eq!(
        status,
        expected_status,
        "{}",
        String::from_utf8_lossy(&body)
    );
    if status == StatusCode::OK {
        Ok(serde_json::from_slice(&body)?)
    } else {
        Ok(Value::Null)
    }
}

async fn create_original_lyrics(
    app: &Router,
    author: &CurrentUser,
    song_id: i32,
) -> Result<(i32, i32)> {
    let create = |language_id, content, is_main| {
        post(
            app,
            author,
            "/song-lyrics",
            "Create",
            json!({ "song_id": song_id, "language_id": language_id,
                "content": content, "is_main": is_main }),
            StatusCode::OK,
        )
    };
    let original = create(JAPANESE, "Original main lyric", true).await?;
    let original_id: i32 =
        serde_json::from_value(original["data"]["entity_id"].clone())?;
    let translation = create(ENGLISH, "Original translation", false).await?;
    let lyrics_id: i32 =
        serde_json::from_value(translation["data"]["entity_id"].clone())?;
    Ok((original_id, lyrics_id))
}

async fn assert_edit_history_identity(
    conn: &infra_db::DatabaseConnection,
    correction_id: i32,
    song_id: i32,
) -> Result<()> {
    let revisions = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(correction_id))
        .all(conn)
        .await?;
    assert_eq!(revisions.len(), 2);
    for revision in revisions {
        let history =
            song_lyrics_history::Entity::find_by_id(revision.entity_history_id)
                .one(conn)
                .await?
                .context("each revision should have lyrics history")?;
        assert_eq!((history.song_id, history.language_id), (song_id, ENGLISH));
    }
    Ok(())
}

#[tokio::test]
async fn resubmitted_lyrics_edit_switches_the_main_lyric_only_on_approval()
-> Result<()> {
    let (state, _images) = test_state().await?;
    let conn = &state.database;
    let song_id = MockSong::titled("Lyrics edit").insert(conn).await?.id;
    let author = CurrentUser(
        MockUser::with_label("lyrics_author")
            .insert(conn)
            .await?
            .into(),
    );
    let approver = MockUser::with_label("lyrics_approver")
        .insert(conn)
        .await?
        .into();
    let app: Router = router()
        .with_state(ArcAppState::new(Arc::new(state.clone())))
        .into();
    let (original_id, lyrics_id) =
        create_original_lyrics(&app, &author, song_id).await?;
    let live = || async {
        let original = song_lyrics::Entity::find_by_id(original_id)
            .one(conn)
            .await?
            .context("original main lyric should exist")?;
        let translation = song_lyrics::Entity::find_by_id(lyrics_id)
            .one(conn)
            .await?
            .context("translation should exist")?;
        Ok::<_, anyhow::Error>((original, translation))
    };
    let before = live().await?;

    let edit_path = format!("/song-lyrics/{lyrics_id}");
    post(
        &app,
        &author,
        &edit_path,
        "Update",
        json!({"song_id": song_id, "content": "Draft", "is_main": false}),
        StatusCode::UNPROCESSABLE_ENTITY,
    )
    .await?;
    let pending = post(
        &app,
        &author,
        &edit_path,
        "Update",
        json!({"content": "Draft", "is_main": false}),
        StatusCode::OK,
    )
    .await?;
    assert_eq!(pending["data"]["kind"], "Submitted");
    let correction_id: i32 =
        serde_json::from_value(pending["data"]["correction_id"].clone())?;
    assert_eq!(live().await?, before);

    let resubmit_path = format!("{edit_path}/correction/{correction_id}");
    post(
        &app,
        &author,
        &resubmit_path,
        "Update",
        json!({"language_id": ENGLISH, "content": "Draft", "is_main": true}),
        StatusCode::UNPROCESSABLE_ENTITY,
    )
    .await?;
    let content = "\n  Final translation  \n";
    let updated = post(
        &app,
        &author,
        &resubmit_path,
        "Update",
        json!({"content": content, "is_main": true}),
        StatusCode::OK,
    )
    .await?;
    assert_eq!(updated, pending);
    assert_eq!(live().await?, before);
    assert_edit_history_identity(conn, correction_id, song_id).await?;

    service::approve(
        &state.sea_orm_repo,
        state.user_events.clone(),
        correction_id,
        approver,
    )
    .await?;
    let (original, translation) = live().await?;
    assert!(!original.is_main);
    assert_eq!(original.content, before.0.content);
    assert!(translation.is_main);
    assert_eq!(translation.content, content);
    assert_eq!(
        (translation.song_id, translation.language_id),
        (song_id, ENGLISH)
    );
    Ok(())
}

#[tokio::test]
async fn conflicting_lyrics_edits_discard_candidate_history() -> Result<()> {
    let (state, _images) = test_state().await?;
    let conn = &state.database;
    let song_id = MockSong::titled("Lyrics conflict").insert(conn).await?.id;
    let author = CurrentUser(
        MockUser::with_label("lyrics_author")
            .insert(conn)
            .await?
            .into(),
    );
    let other_author = CurrentUser(
        MockUser::with_label("conflicting_lyrics_author")
            .insert(conn)
            .await?
            .into(),
    );
    let app: Router = router()
        .with_state(ArcAppState::new(Arc::new(state.clone())))
        .into();
    let original = post(
        &app,
        &author,
        "/song-lyrics",
        "Create",
        json!({"song_id": song_id, "language_id": JAPANESE, "content": "Original lyric", "is_main": true}),
        StatusCode::OK,
    )
    .await?;
    let lyrics_id: i32 =
        serde_json::from_value(original["data"]["entity_id"].clone())?;
    let edit_path = format!("/song-lyrics/{lyrics_id}");
    let pending = post(
        &app,
        &author,
        &edit_path,
        "Update",
        json!({"content": "Pending edit", "is_main": true}),
        StatusCode::OK,
    )
    .await?;
    assert_eq!(pending["data"]["kind"], "Submitted");
    let correction_id: i32 =
        serde_json::from_value(pending["data"]["correction_id"].clone())?;
    let revisions = || {
        correction_revision::Entity::find()
            .filter(correction_revision::Column::CorrectionId.eq(correction_id))
            .all(conn)
    };
    let before = revisions().await?;
    assert_eq!(before.len(), 1);

    let wrong_resubmit_path = format!("{edit_path}/correction/-1");
    for (path, content) in [
        (edit_path.as_str(), "Conflicting new edit"),
        (wrong_resubmit_path.as_str(), "Conflicting resubmission"),
    ] {
        let conflict = post(
            &app,
            &other_author,
            path,
            "Update",
            json!({"content": content, "is_main": true}),
            StatusCode::OK,
        )
        .await?;
        assert_eq!(
            conflict["data"],
            json!({"kind": "Conflict", "correction_id": correction_id, "entity_id": lyrics_id}),
        );
        assert!(
            song_lyrics_history::Entity::find()
                .filter(song_lyrics_history::Column::SongId.eq(song_id))
                .filter(song_lyrics_history::Column::Content.eq(content))
                .one(conn)
                .await?
                .is_none(),
            "candidate history persisted after {path}"
        );
    }

    assert_eq!(revisions().await?, before);
    assert!(
        correction_subscription::Entity::find_by_id((
            other_author.0.id,
            correction_id,
        ))
        .one(conn)
        .await?
        .is_none()
    );
    Ok(())
}

async fn insert_legacy_correction(
    tx: &infra_db::DatabaseTransaction,
    author_id: i32,
    target_lyric_id: i32,
    other_lyric_id: i32,
) -> Result<(i32, i32)> {
    let history_id = song_lyrics_repo::create_history(
        tx,
        other_lyric_id,
        "Wrong lyric",
        true,
    )
    .await?
    .context("the mismatched history should identify the other live lyric")?;
    let pending = correction::Entity::insert(correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Pending),
        r#type: Set(CorrectionType::Update),
        entity_type: Set(EntityType::SongLyrics),
        entity_id: Set(target_lyric_id),
        created_at: NotSet,
        handled_at: NotSet,
    })
    .exec_with_returning(tx)
    .await?;
    correction_revision::Entity::insert(correction_revision::ActiveModel {
        correction_id: Set(pending.id),
        entity_history_id: Set(history_id),
        author_id: Set(author_id),
        description: Set(String::new()),
    })
    .exec(tx)
    .await?;
    Ok((pending.id, history_id))
}

#[tokio::test]
async fn mismatched_legacy_lyrics_history_leaves_correction_pending_and_lyrics_unchanged()
-> Result<()> {
    let repo = SeaOrmRepository::new(test_connection().await?);
    let conn = &repo.conn;
    let song_id = MockSong::titled("First song").insert(conn).await?.id;
    let other_song_id = MockSong::titled("Second song").insert(conn).await?.id;
    let author_id = MockUser::with_label("legacy_lyrics_author")
        .insert(conn)
        .await?
        .id;
    let approver: User = MockUser::with_label("legacy_lyrics_approver")
        .insert(conn)
        .await?
        .into();
    let tx = repo.begin_tx().await?;
    let tx_conn = tx.conn();
    let create_lyrics = |id| async move {
        let main_id =
            song_lyrics_repo::create(tx_conn, id, JAPANESE, "Main lyric", true)
                .await?;
        let translation_id = song_lyrics_repo::create(
            tx_conn,
            id,
            ENGLISH,
            "Translation",
            false,
        )
        .await?;
        Ok::<_, anyhow::Error>((main_id, translation_id))
    };
    let (main_id, translation_id) = create_lyrics(song_id).await?;
    let (_, other_translation_id) = create_lyrics(other_song_id).await?;
    tx.commit().await?;

    let lyrics = || {
        song_lyrics::Entity::find()
            .filter(song_lyrics::Column::SongId.is_in([song_id, other_song_id]))
            .order_by_asc(song_lyrics::Column::Id)
            .all(conn)
    };
    let before = lyrics().await?;
    let events = UserEventSender::new(1);

    for (mismatch, target_id, other_id) in [
        ("language", main_id, translation_id),
        ("song", translation_id, other_translation_id),
    ] {
        let tx = repo.begin_tx().await?;
        let (correction_id, history_id) =
            insert_legacy_correction(tx.conn(), author_id, target_id, other_id)
                .await?;
        tx.commit().await?;

        let error = service::approve(
            &repo,
            events.clone(),
            correction_id,
            approver.clone(),
        )
        .await
        .err()
        .with_context(|| {
            format!("approval must reject a {mismatch} mismatch")
        })?;
        let ModerationError::Internal(error) = error else {
            anyhow::bail!("expected an internal approval error, got {error:?}");
        };
        assert!(
            matches!(
                error.0.downcast_ref::<ApplyEditError>(),
                Some(ApplyEditError::IdentityMismatch {
                    lyrics_id,
                    history_id: mismatched_history_id,
                }) if (*lyrics_id, *mismatched_history_id) == (target_id, history_id)
            ),
            "unexpected error for {mismatch} mismatch: {error:?}"
        );
        assert_eq!(lyrics().await?, before, "{mismatch} mismatch");
        let pending = correction::Entity::find_by_id(correction_id)
            .one(conn)
            .await?
            .context("the correction should still exist")?;
        assert_eq!(
            pending.status,
            CorrectionStatus::Pending,
            "{mismatch} mismatch"
        );
    }
    Ok(())
}
