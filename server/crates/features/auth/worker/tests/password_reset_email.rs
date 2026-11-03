mod utils;

use anyhow::Result;
use apalis::prelude::State;
use auth_core::password_reset::password_reset_state_key;
use chrono::{DateTime, FixedOffset, Utc};
use fred::prelude::KeysInterface;
use infra_testing::password_reset::RecordingEmailSender;
use infra_worker::Storage;
use utils::*;

#[tokio::test]
async fn worker_sends_password_reset_email() -> Result<()> {
    let (sender, mut sent_messages) = RecordingEmailSender::channel();
    let mut worker = TestWorker::start(sender).await?;

    let reset =
        PasswordResetEmailCase::active(1_000_001, "111111", "active-code-hash");

    store_password_reset_state(&worker.redis_pool, &reset).await?;

    let task_id = worker.queue.push(reset.job).await?.task_id;

    wait_for_job_state(&worker.queue, &task_id, State::Done).await?;

    let (recipient, code) = sent_messages.try_recv()?;

    assert_eq!(recipient.as_str(), "user-1000001@example.com");
    assert_eq!(code.to_string(), "111111");
    assert_no_email_was_sent(&mut sent_messages);

    worker.shutdown().await?;

    Ok(())
}

#[tokio::test]
async fn worker_ignores_password_reset_email_without_state() -> Result<()> {
    let (sender, mut sent_messages) = RecordingEmailSender::channel();
    let mut worker = TestWorker::start(sender).await?;

    let reset = PasswordResetEmailCase::active(
        1_000_002,
        "222222",
        "missing-state-code-hash",
    );

    worker
        .redis_pool
        .del::<usize, _>(password_reset_state_key(reset.job.user_id))
        .await?;

    let task_id = worker.queue.push(reset.job).await?.task_id;

    wait_for_job_state(&worker.queue, &task_id, State::Done).await?;
    assert_no_email_was_sent(&mut sent_messages);

    worker.shutdown().await?;

    Ok(())
}

#[tokio::test]
async fn worker_ignores_stale_password_reset_email() -> Result<()> {
    let (sender, mut sent_messages) = RecordingEmailSender::channel();
    let mut worker = TestWorker::start(sender).await?;

    let code_sent_at: DateTime<FixedOffset> = Utc::now().into();
    let replaced = PasswordResetEmailCase::sent_at(
        1_000_003,
        "333333",
        "replaced-code-hash",
        code_sent_at,
    );
    let current = PasswordResetEmailCase::sent_at(
        1_000_003,
        "444444",
        "current-code-hash",
        code_sent_at,
    );

    store_password_reset_state(&worker.redis_pool, &current).await?;
    let task_id = worker.queue.push(replaced.job).await?.task_id;

    wait_for_job_state(&worker.queue, &task_id, State::Done).await?;
    assert_no_email_was_sent(&mut sent_messages);

    worker.shutdown().await?;

    Ok(())
}

#[tokio::test]
async fn worker_ignores_expired_password_reset_email() -> Result<()> {
    let (sender, mut sent_messages) = RecordingEmailSender::channel();
    let mut worker = TestWorker::start(sender).await?;

    let reset = PasswordResetEmailCase::expired(
        1_000_004,
        "444444",
        "expired-code-hash",
    );

    store_password_reset_state(&worker.redis_pool, &reset).await?;
    let task_id = worker.queue.push(reset.job).await?.task_id;

    wait_for_job_state(&worker.queue, &task_id, State::Done).await?;
    assert_no_email_was_sent(&mut sent_messages);

    worker.shutdown().await?;

    Ok(())
}

#[tokio::test]
async fn worker_retries_redis_read_failures() -> Result<()> {
    let (sender, mut sent_messages) = RecordingEmailSender::channel();
    let mut worker = TestWorker::start(sender).await?;

    let reset = PasswordResetEmailCase::active(
        1_000_005,
        "555555",
        "redis-error-code-hash",
    );

    make_password_reset_state_unreadable(&worker.redis_pool, reset.job.user_id)
        .await?;

    let task_id = worker.queue.push(reset.job).await?.task_id;

    let persisted_attempts =
        wait_for_job_state(&worker.queue, &task_id, State::Killed).await?;

    assert!(persisted_attempts > 1);
    assert_no_email_was_sent(&mut sent_messages);

    worker.shutdown().await?;

    Ok(())
}

#[tokio::test]
async fn worker_retries_on_retryable_delivery_failure() -> Result<()> {
    let (send_attempt_sender, send_attempts) =
        tokio::sync::mpsc::unbounded_channel();
    let sender = FailingSender {
        send_attempt_sender,
        retryable: true,
    };
    let mut worker = TestWorker::start(sender).await?;

    let reset = PasswordResetEmailCase::active(
        1_000_006,
        "666666",
        "mail-error-code-hash",
    );

    store_password_reset_state(&worker.redis_pool, &reset).await?;
    let task_id = worker.queue.push(reset.job).await?.task_id;

    wait_for_job_state(&worker.queue, &task_id, State::Killed).await?;

    assert!(send_attempts.len() > 1);

    worker.shutdown().await?;

    Ok(())
}

#[tokio::test]
async fn worker_does_not_retry_on_permanent_delivery_failure() -> Result<()> {
    let (send_attempt_sender, send_attempts) =
        tokio::sync::mpsc::unbounded_channel();
    let sender = FailingSender {
        send_attempt_sender,
        retryable: false,
    };
    let mut worker = TestWorker::start(sender).await?;

    let reset = PasswordResetEmailCase::active(
        1_000_007,
        "777777",
        "mail-permanent-error",
    );

    store_password_reset_state(&worker.redis_pool, &reset).await?;
    let task_id = worker.queue.push(reset.job).await?.task_id;

    wait_for_job_state(&worker.queue, &task_id, State::Killed).await?;

    assert_eq!(send_attempts.len(), 1);

    worker.shutdown().await?;

    Ok(())
}

#[tokio::test]
async fn worker_does_not_retry_invalid_password_reset_state() -> Result<()> {
    let (sender, mut sent_messages) = RecordingEmailSender::channel();
    let mut worker = TestWorker::start(sender).await?;
    let reset = PasswordResetEmailCase::active(
        1_000_008,
        "888888",
        "invalid-state-code-hash",
    );

    worker
        .redis_pool
        .set::<(), _, _>(
            password_reset_state_key(reset.job.user_id),
            "{",
            None,
            None,
            false,
        )
        .await?;
    let task_id = worker.queue.push(reset.job).await?.task_id;

    let attempts =
        wait_for_job_state(&worker.queue, &task_id, State::Done).await?;
    assert_eq!(attempts, 1);
    assert_no_email_was_sent(&mut sent_messages);

    worker.shutdown().await?;
    assert_invalid_state_diagnostic(&task_id, 1000008)?;

    Ok(())
}

#[tokio::test]
async fn worker_sends_email_after_retryable_delivery_failure() -> Result<()> {
    let (sender, mut sent_messages) = RecordingEmailSender::channel();
    let mut worker = TestWorker::start(FailsOnceSender::new(sender)).await?;
    let reset = PasswordResetEmailCase::active(
        1_000_009,
        "999999",
        "delivery-recovery-code-hash",
    );

    store_password_reset_state(&worker.redis_pool, &reset).await?;
    let task_id = worker.queue.push(reset.job).await?.task_id;

    let attempts =
        wait_for_job_state(&worker.queue, &task_id, State::Done).await?;
    assert_eq!(attempts, 2);
    let (recipient, code) = sent_messages.try_recv()?;
    assert_eq!(recipient.as_str(), "user-1000009@example.com");
    assert_eq!(code.to_string(), "999999");
    assert_no_email_was_sent(&mut sent_messages);

    worker.shutdown().await?;
    assert_retry_trace(&task_id, 1000009)?;

    Ok(())
}
