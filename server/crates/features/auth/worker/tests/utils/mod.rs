use std::io;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use anyhow::{Context, Result};
use apalis::prelude::{BackendExpose, State};
use auth_core::password_reset::{
    EmailSender, PASSWORD_RESET_CODE_EXPIRES_MINUTES, PasswordResetEmailJob,
    PasswordResetState, password_reset_state_key,
};
use auth_core::verification_code::VerificationCode;
use auth_worker::password_reset_email::{Queue, register_worker};
use chrono::{DateTime, FixedOffset, TimeDelta, Utc};
use domain::email::Email;
use fastrace::collector::{Config as TraceConfig, SpanRecord, TestReporter};
use fred::prelude::{ClientLike, Config, KeysInterface, ListInterface, Pool};
use infra_email::DeliveryFailure;
use infra_testing::password_reset::RecordingEmailSender;
use infra_testing::test_redis_url;
use infra_worker::{Monitor, RedisQueueConfig, TaskId, redis_queue};

const JOB_STATE_TIMEOUT: Duration = Duration::from_secs(30);
static TEST_QUEUE_SEQUENCE: AtomicU64 = AtomicU64::new(0);
static TRACE_REPORTER: OnceLock<TestReporter> = OnceLock::new();

fn trace_reporter() -> &'static TestReporter {
    TRACE_REPORTER.get_or_init(|| {
        logforth::starter_log::builder()
            .dispatch(|dispatch| {
                dispatch
                    .filter(logforth::record::LevelFilter::All)
                    .diagnostic(
                        logforth::diagnostic::FastraceDiagnostic::default(),
                    )
                    .append(logforth::append::FastraceEvent::default())
            })
            .apply();
        let (reporter, _) = TestReporter::new();
        fastrace::set_reporter(
            TestReporter {
                spans: reporter.spans.clone(),
            },
            TraceConfig::default(),
        );
        reporter
    })
}

pub(super) fn assert_retry_trace(task_id: &TaskId, user_id: i32) -> Result<()> {
    fastrace::flush();
    let task_id = task_id.to_string();
    let records = trace_reporter().spans.lock().clone();
    let root = records
        .iter()
        .find(|record| {
            record.name == "worker.password_reset_email"
                && property(record, "task.id") == Some(task_id.as_str())
        })
        .context("missing email run")?;
    let mut attempts = records
        .iter()
        .filter(|record| {
            record.name == "worker.password_reset_email.attempt"
                && record.trace_id == root.trace_id
                && record.parent_id == root.span_id
        })
        .collect::<Vec<_>>();
    attempts.sort_by_key(|record| property(record, "attempt"));
    assert_eq!(attempts.len(), 2);
    assert_eq!(property(attempts[0], "attempt"), Some("1"));
    assert_eq!(property(attempts[1], "attempt"), Some("2"));
    assert!(attempts[0].events.iter().any(|event| {
        event.properties.iter().any(|(key, value)| {
            key == "user_id" && value.as_ref() == user_id.to_string()
        }) && event.properties.iter().any(|(key, value)| {
            key == "error" && value.contains("temporary mail delivery failure")
        })
    }));
    Ok(())
}

pub(super) fn assert_invalid_state_diagnostic(
    task_id: &TaskId,
    user_id: i32,
) -> Result<()> {
    fastrace::flush();
    let task_id = task_id.to_string();
    let records = trace_reporter().spans.lock().clone();
    let attempt = records
        .iter()
        .find(|record| {
            record.name == "worker.password_reset_email.attempt"
                && property(record, "task.id") == Some(task_id.as_str())
        })
        .context("missing email attempt")?;
    assert!(attempt.events.iter().any(|event| {
        event.name.contains("deserialize password reset state")
            && event.properties.iter().any(|(key, value)| {
                key == "user_id" && value.as_ref() == user_id.to_string()
            })
            && event
                .properties
                .iter()
                .any(|(key, value)| key == "error" && !value.is_empty())
    }));
    Ok(())
}

fn property<'a>(record: &'a SpanRecord, key: &str) -> Option<&'a str> {
    record
        .properties
        .iter()
        .find(|(name, _)| name == key)
        .map(|(_, value)| value.as_ref())
}

pub(super) struct PasswordResetEmailCase {
    pub(super) job: PasswordResetEmailJob,
    state: PasswordResetState,
}

impl PasswordResetEmailCase {
    pub(super) fn active(user_id: i32, code: &str, code_hash: &str) -> Self {
        Self::sent_at(user_id, code, code_hash, Utc::now().into())
    }

    pub(super) fn expired(user_id: i32, code: &str, code_hash: &str) -> Self {
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
            unreachable!("awaiting_code should create an AwaitingCode state");
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
        trace_reporter();
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
            Monitor::default(),
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
    fn send(
        &self,
        _recipient: Email,
        _code: VerificationCode<6>,
    ) -> impl std::future::Future<Output = Result<(), DeliveryFailure>> {
        let result = self
            .send_attempt_sender
            .send(())
            .map_err(|_| {
                DeliveryFailure::permanent(io::Error::other(
                    "send attempt receiver closed",
                ))
            })
            .and_then(|()| {
                let error = io::Error::other("mail delivery failed");
                Err(if self.retryable {
                    DeliveryFailure::retryable(error)
                } else {
                    DeliveryFailure::permanent(error)
                })
            });
        std::future::ready(result)
    }
}

#[derive(Clone)]
pub(super) struct FailsOnceSender {
    sender: RecordingEmailSender,
    has_failed: Arc<AtomicBool>,
}

impl FailsOnceSender {
    pub(super) fn new(sender: RecordingEmailSender) -> Self {
        Self {
            sender,
            has_failed: Arc::new(AtomicBool::new(false)),
        }
    }
}

impl EmailSender for FailsOnceSender {
    async fn send(
        &self,
        recipient: Email,
        code: VerificationCode<6>,
    ) -> Result<(), DeliveryFailure> {
        if !self.has_failed.swap(true, Ordering::Relaxed) {
            return Err(DeliveryFailure::retryable(io::Error::other(
                "temporary mail delivery failure",
            )));
        }

        self.sender.send(recipient, code).await
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
) -> Result<usize> {
    tokio::time::timeout(JOB_STATE_TIMEOUT, async {
        loop {
            if let Some(job) = queue
                .list_jobs(&expected_state, 1)
                .await?
                .into_iter()
                .find(|job| &job.parts.task_id == task_id)
            {
                return Ok(job.parts.attempt.current());
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await?
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
