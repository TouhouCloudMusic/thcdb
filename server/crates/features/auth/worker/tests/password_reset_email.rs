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

    wait_for_job_state(&worker.queue, &task_id, State::Killed).await?;

    let persisted_attempts =
        job_attempt(&worker.queue, &task_id, State::Killed).await?;

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

mod utils {
    use std::io;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::Duration;

    use anyhow::{Context, Result};
    use apalis::prelude::{BackendExpose, State};
    use auth_core::password_reset::{
        EmailSender, PASSWORD_RESET_CODE_EXPIRES_MINUTES,
        PasswordResetEmailJob, PasswordResetState, password_reset_state_key,
    };
    use auth_core::verification_code::VerificationCode;
    use auth_worker::password_reset_email::{Queue, register_worker};
    use chrono::{DateTime, FixedOffset, TimeDelta, Utc};
    use domain::email::Email;
    use fred::prelude::{
        ClientLike, Config, KeysInterface, ListInterface, Pool,
    };
    use infra_email::DeliveryFailure;
    use infra_testing::test_redis_url;
    use infra_worker::{Monitor, RedisQueueConfig, TaskId, redis_queue};

    const JOB_STATE_TIMEOUT: Duration = Duration::from_secs(30);
    static TEST_QUEUE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    pub(super) struct PasswordResetEmailCase {
        pub(super) job: PasswordResetEmailJob,
        state: PasswordResetState,
    }

    impl PasswordResetEmailCase {
        pub(super) fn active(
            user_id: i32,
            code: &str,
            code_hash: &str,
        ) -> Self {
            Self::sent_at(user_id, code, code_hash, Utc::now().into())
        }

        pub(super) fn expired(
            user_id: i32,
            code: &str,
            code_hash: &str,
        ) -> Self {
            let code_sent_at = Utc::now()
                - TimeDelta::minutes(PASSWORD_RESET_CODE_EXPIRES_MINUTES)
                - TimeDelta::minutes(1);

            Self::sent_at(user_id, code, code_hash, code_sent_at.into())
        }

        pub(super) fn sent_at(
            user_id: i32,
            code: &str,
            code_hash: &str,
            code_sent_at: DateTime<FixedOffset>,
        ) -> Self {
            let state = PasswordResetState::awaiting_code(
                code_hash.to_string(),
                code_sent_at,
            );
            let PasswordResetState::AwaitingCode {
                code_expires_at, ..
            } = &state
            else {
                unreachable!(
                    "awaiting_code should create an AwaitingCode state"
                );
            };

            let email = Email::parse(&format!("user-{user_id}@example.com"))
                .expect("password reset test email should be valid");
            let code = VerificationCode::parse(code)
                .expect("password reset test code should have six digits");

            Self {
                job: PasswordResetEmailJob {
                    user_id,
                    email,
                    code,
                    code_hash: code_hash.to_string(),
                    code_expires_at: *code_expires_at,
                },
                state,
            }
        }
    }

    pub(super) struct TestWorker {
        pub(super) redis_pool: Pool,
        pub(super) queue: Queue,
        monitor_task: tokio::task::JoinHandle<std::io::Result<()>>,
    }

    impl TestWorker {
        pub(super) async fn start(sender: impl EmailSender) -> Result<Self> {
            let redis_url = test_redis_url();
            let redis_pool = connect_redis(&redis_url).await?;

            let queue_namespace = format!(
                "test:password_reset_email:{}:{}:{}",
                std::process::id(),
                Utc::now().timestamp_nanos_opt().unwrap_or_default(),
                TEST_QUEUE_SEQUENCE.fetch_add(1, Ordering::Relaxed),
            );
            let queue = redis_queue(
                &redis_url,
                RedisQueueConfig::new(queue_namespace, Duration::from_secs(1)),
            )
            .await
            .map_err(anyhow::Error::from_boxed)?;

            let monitor = register_worker(
                Monitor::new(),
                redis_pool.clone(),
                sender,
                queue.clone(),
            );

            let monitor_task = tokio::spawn(monitor.run());

            Ok(Self {
                redis_pool,
                queue,
                monitor_task,
            })
        }

        pub(super) async fn shutdown(self) -> Result<()> {
            self.monitor_task.abort();
            let monitor_result = self.monitor_task.await;
            if !matches!(&monitor_result, Err(error) if error.is_cancelled()) {
                monitor_result??;
            }

            self.redis_pool.quit().await?;

            Ok(())
        }
    }

    #[derive(Clone)]
    pub(super) struct FailingSender {
        pub(super) send_attempt_sender: tokio::sync::mpsc::UnboundedSender<()>,
        pub(super) retryable: bool,
    }

    impl EmailSender for FailingSender {
        async fn send(
            &self,
            _recipient: Email,
            _code: VerificationCode<6>,
        ) -> Result<(), DeliveryFailure> {
            self.send_attempt_sender.send(()).map_err(|_| {
                DeliveryFailure::permanent(io::Error::other(
                    "send attempt receiver closed",
                ))
            })?;

            let error = io::Error::other("mail delivery failed");
            Err(if self.retryable {
                DeliveryFailure::retryable(error)
            } else {
                DeliveryFailure::permanent(error)
            })
        }
    }

    async fn connect_redis(redis_url: &str) -> Result<Pool> {
        let mut config = Config::from_url(redis_url)?;

        config.fail_fast = true;

        let pool = Pool::new(config, None, None, None, 1)?;

        pool.init().await?;

        Ok(pool)
    }

    pub(super) async fn store_password_reset_state(
        redis_pool: &Pool,
        reset: &PasswordResetEmailCase,
    ) -> Result<()> {
        let state_payload = reset.state.to_payload()?;

        redis_pool
            .set::<(), _, _>(
                password_reset_state_key(reset.job.user_id),
                state_payload,
                None,
                None,
                false,
            )
            .await?;

        Ok(())
    }

    pub(super) async fn make_password_reset_state_unreadable(
        redis_pool: &Pool,
        user_id: i32,
    ) -> Result<()> {
        redis_pool
            .del::<usize, _>(password_reset_state_key(user_id))
            .await?;

        redis_pool
            .lpush::<usize, _, _>(
                password_reset_state_key(user_id),
                vec!["wrong-type"],
            )
            .await?;

        Ok(())
    }

    pub(super) async fn wait_for_job_state(
        queue: &Queue,
        task_id: &TaskId,
        expected_state: State,
    ) -> Result<()> {
        tokio::time::timeout(JOB_STATE_TIMEOUT, async {
            loop {
                if queue
                    .list_jobs(&expected_state, 1)
                    .await?
                    .into_iter()
                    .any(|queued_job| &queued_job.parts.task_id == task_id)
                {
                    return Ok::<(), anyhow::Error>(());
                }
                tokio::time::sleep(Duration::from_millis(20)).await;
            }
        })
        .await??;

        Ok(())
    }

    pub(super) async fn job_attempt(
        queue: &Queue,
        task_id: &TaskId,
        state: State,
    ) -> Result<usize> {
        queue
            .list_jobs(&state, 1)
            .await?
            .into_iter()
            .find(|job| &job.parts.task_id == task_id)
            .map(|job| job.parts.attempt.current())
            .context("password reset email job should exist")
    }

    pub(super) fn assert_no_email_was_sent(
        sent_messages: &mut tokio::sync::mpsc::UnboundedReceiver<(
            Email,
            VerificationCode<6>,
        )>,
    ) {
        assert!(matches!(
            sent_messages.try_recv(),
            Err(tokio::sync::mpsc::error::TryRecvError::Empty)
        ));
    }
}
