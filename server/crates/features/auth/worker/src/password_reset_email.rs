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
use infra_worker::{
    Data, Monitor, RedisQueue, RedisQueueConfig, WorkerBuilder,
    WorkerBuilderExt, WorkerError, WorkerFactoryFn, permanent_error,
    retryable_error,
};

pub type Queue = RedisQueue<PasswordResetEmailJob>;

pub async fn queue(redis_url: &str) -> Result<Queue, WorkerError> {
    infra_worker::redis_queue(
        redis_url,
        RedisQueueConfig::new(PASSWORD_RESET_EMAIL_KEY, Duration::from_secs(1)),
    )
    .await
}

#[derive(Clone)]
pub(super) struct Sender {
    mailer: Mailer,
}

impl Sender {
    pub(super) const fn new(mailer: Mailer) -> Self {
        Self { mailer }
    }
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
        WorkerBuilder::new("password_reset_email")
            .data(state)
            .retry(RetryPolicy::retries(2).with_backoff(retry_backoff))
            .enable_tracing()
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
) -> Result<(), infra_worker::Error> {
    let now: DateTime<FixedOffset> = Utc::now().into();
    if job.code_expires_at <= now {
        return Ok(());
    }

    let should_send = should_send_email(&state.redis_pool, &job)
        .await
        .map_err(|err| {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:% = err;
                "failed to load password reset state while processing email job"
            );
            retryable_error(err)
        })?;

    if !should_send {
        return Ok(());
    }

    state
        .sender
        .send(job.email, job.code)
        .await
        .map_err(|failure| {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:% = failure;
                "failed to send password reset email"
            );

            if failure.is_retryable() {
                retryable_error(failure)
            } else {
                permanent_error(failure)
            }
        })?;

    Ok(())
}

async fn should_send_email(
    redis_pool: &fred::prelude::Pool,
    job: &PasswordResetEmailJob,
) -> Result<bool, fred::error::Error> {
    let payload = redis_pool
        .get::<Option<String>, _>(password_reset_state_key(job.user_id))
        .await?;

    let Some(payload) = payload else {
        return Ok(false);
    };

    let state = match PasswordResetState::from_payload(&payload) {
        Ok(state) => state,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:% = err;
                "failed to deserialize password reset state while processing email job"
            );
            return Ok(false);
        }
    };

    let PasswordResetState::AwaitingCode {
        code_hash,
        code_expires_at,
        ..
    } = state
    else {
        return Ok(false);
    };

    Ok(code_hash == job.code_hash
        && code_expires_at == job.code_expires_at
        && {
            let now: DateTime<FixedOffset> = Utc::now().into();
            now <= code_expires_at
        })
}
