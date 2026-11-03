use std::time::Duration;

use apalis::layers::retry::backoff::{ExponentialBackoffMaker, MakeBackoff};
use apalis::layers::retry::{HasherRng, RetryPolicy};
use auth_core::password_reset::{
    EmailSender, PASSWORD_RESET_CODE_EXPIRES_MINUTES, PASSWORD_RESET_EMAIL_KEY,
    PasswordResetEmailJob, PasswordResetState, password_reset_state_key,
};
use auth_core::verification_code::VerificationCode;
use chrono::{DateTime, FixedOffset, Utc};
use domain::email::Email;
use fred::prelude::KeysInterface;
use infra_email::{DeliveryFailure, Mailer};
use infra_error::{ContextError, ResultExt};
use infra_worker::{
    AttemptLayer, Data, Monitor, RedisQueue, RedisQueueConfig, RunLayer,
    TaskOutcome, WorkerBuilder, WorkerBuilderExt, WorkerError, WorkerFactoryFn,
    permanent_error, retryable_error,
};

pub type Queue = RedisQueue<PasswordResetEmailJob>;

pub const JOB_NAME: &str = "password_reset_email";
const RETRIES: usize = 2;

pub async fn queue(redis_url: &str) -> Result<Queue, WorkerError> {
    infra_worker::redis_queue(
        redis_url,
        RedisQueueConfig::new(PASSWORD_RESET_EMAIL_KEY, Duration::from_secs(1)),
    )
    .await
}

#[derive(Clone)]
pub(super) struct Sender {
    pub(super) mailer: Mailer,
}

impl EmailSender for Sender {
    async fn send(
        &self,
        recipient: Email,
        code: VerificationCode<6>,
    ) -> Result<(), DeliveryFailure> {
        let message = self.mailer.build_message(
            &recipient,
            "Reset your password",
            format!(
                "Your password reset code is {code}. It expires in {PASSWORD_RESET_CODE_EXPIRES_MINUTES} minutes."
            ),
        )?;

        self.mailer.send(message).await
    }
}

pub fn register_worker<S: EmailSender>(
    monitor: Monitor,
    redis_pool: fred::prelude::Pool,
    sender: S,
    queue: Queue,
) -> Monitor {
    let state = WorkerState { redis_pool, sender };
    let retry_backoff = ExponentialBackoffMaker::new(
        Duration::from_secs(1),
        Duration::from_secs(3),
        0.5,
        HasherRng::default(),
    )
    .expect("password reset email retry backoff")
    .make_backoff();

    monitor.register(
        WorkerBuilder::new(JOB_NAME)
            .data(state)
            .layer(RunLayer)
            .retry(RetryPolicy::retries(RETRIES).with_backoff(retry_backoff))
            .layer(AttemptLayer::with_fields(|job: &PasswordResetEmailJob| {
                [("user_id", job.user_id)]
            }))
            .backend(queue)
            .build_fn(handle::<S>),
    )
}

#[derive(Clone)]
struct WorkerState<S: EmailSender> {
    redis_pool: fred::prelude::Pool,
    sender: S,
}

async fn handle<S: EmailSender>(
    job: PasswordResetEmailJob,
    state: Data<WorkerState<S>>,
) -> Result<TaskOutcome, infra_worker::Error> {
    let now: DateTime<FixedOffset> = Utc::now().into();
    if job.code_expires_at <= now {
        return Ok(TaskOutcome::Skipped);
    }

    if let Some(disposition) =
        should_send_email(&state.redis_pool, &job).await?
    {
        return Ok(disposition);
    }

    state
        .sender
        .send(job.email, job.code)
        .await
        .map_err(|failure| {
            let retryable = failure.is_retryable();
            let failure =
                ContextError::new("send password reset email", failure);
            if retryable {
                retryable_error(failure)
            } else {
                permanent_error(failure)
            }
        })?;

    Ok(TaskOutcome::Completed)
}

async fn should_send_email(
    redis_pool: &fred::prelude::Pool,
    job: &PasswordResetEmailJob,
) -> Result<Option<TaskOutcome>, infra_worker::Error> {
    let payload = redis_pool
        .get::<Option<String>, _>(password_reset_state_key(job.user_id))
        .await
        .context("load password reset state")
        .map_err(retryable_error)?;

    let Some(payload) = payload else {
        return Ok(Some(TaskOutcome::Skipped));
    };

    let reset_state = match PasswordResetState::from_payload(&payload) {
        Ok(state) => state,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:% = err;
                "failed to deserialize password reset state while processing email job"
            );
            return Ok(Some(TaskOutcome::Discarded));
        }
    };

    let PasswordResetState::AwaitingCode {
        code_hash,
        code_expires_at,
        ..
    } = reset_state
    else {
        return Ok(Some(TaskOutcome::Skipped));
    };

    let now: DateTime<FixedOffset> = Utc::now().into();
    let should_send = code_hash == job.code_hash
        && code_expires_at == job.code_expires_at
        && now <= code_expires_at;

    Ok(if should_send {
        None
    } else {
        Some(TaskOutcome::Skipped)
    })
}
