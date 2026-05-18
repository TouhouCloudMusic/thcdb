use std::error::Error as StdError;
use std::time::Duration;

use auth_core::password_reset::{
    PASSWORD_RESET_EMAIL_KEY, PasswordResetEmailJob, PasswordResetState,
    build_password_reset_email_message, is_password_reset_code,
    password_reset_state_key,
};
use chrono::{DateTime, FixedOffset, Utc};
use fred::prelude::KeysInterface;
use infra_worker::{
    Attempt, Data, RedisContext, RedisQueue, RedisQueueConfig, TaskId,
    WorkerError, reschedule_job,
};
use lettre::message::{Mailbox, Message as EmailMessage};

pub type PasswordResetEmailQueue = RedisQueue<PasswordResetEmailJob>;

pub async fn queue(
    redis_url: &str,
) -> Result<PasswordResetEmailQueue, WorkerError> {
    infra_worker::redis_queue(
        redis_url,
        RedisQueueConfig::new(PASSWORD_RESET_EMAIL_KEY, Duration::from_secs(1)),
    )
    .await
}

pub trait PasswordResetEmailMailer: Clone + Send + Sync + 'static {
    fn from(&self) -> &Mailbox;

    async fn send(
        &self,
        message: EmailMessage,
    ) -> Result<(), Box<dyn StdError + Send + Sync>>;
}

#[derive(Clone)]
pub struct WorkerState<M: PasswordResetEmailMailer> {
    pub redis_pool: fred::prelude::Pool,
    pub mailer: M,
    pub queue: PasswordResetEmailQueue,
}

pub async fn handle<M: PasswordResetEmailMailer>(
    job: PasswordResetEmailJob,
    state: Data<WorkerState<M>>,
    task_id: TaskId,
    attempt: Attempt,
    context: RedisContext,
) -> Result<(), std::io::Error> {
    let now: DateTime<FixedOffset> = Utc::now().into();
    if job.code_expires_at <= now {
        return Ok(());
    }

    if !password_reset_email_job_is_current(&state.redis_pool, &job).await {
        return Ok(());
    }

    let to: Mailbox = match job.email.parse() {
        Ok(to) => to,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:% = err;
                "invalid password reset recipient address"
            );
            return Ok(());
        }
    };
    if !is_password_reset_code(&job.code) {
        log::error!(
            target: "features.auth.password_reset.email_worker",
            user_id = job.user_id;
            "invalid password reset code in email job"
        );
        return Ok(());
    }
    let message = match build_password_reset_email_message(
        state.mailer.from().clone(),
        to,
        job.code.as_str(),
    ) {
        Ok(message) => message,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:? = err;
                "failed to build password reset email message"
            );
            return Ok(());
        }
    };

    if let Err(err) = state.mailer.send(message).await {
        log::error!(
            target: "features.auth.password_reset.email_worker",
            user_id = job.user_id,
            error:% = err;
            "failed to send password reset email"
        );
        let user_id = job.user_id;
        let mut queue = state.queue.clone();
        return reschedule_job(
            &mut queue,
            job,
            task_id,
            attempt,
            context,
            Duration::from_secs(1),
        )
        .await
        .map_err(|push_err| {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = user_id,
                error:? = push_err;
                "failed to reschedule password reset email job"
            );
            std::io::Error::other(push_err.to_string())
        });
    }

    Ok(())
}

pub async fn password_reset_email_job_is_current(
    redis_pool: &fred::prelude::Pool,
    job: &PasswordResetEmailJob,
) -> bool {
    let payload = match redis_pool
        .get::<Option<String>, _>(password_reset_state_key(job.user_id))
        .await
    {
        Ok(payload) => payload,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:? = err;
                "failed to load password reset state while processing email job"
            );
            return false;
        }
    };

    let Some(payload) = payload else {
        return false;
    };

    let state = match PasswordResetState::from_payload(&payload) {
        Ok(state) => state,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.email_worker",
                user_id = job.user_id,
                error:? = err;
                "failed to deserialize password reset state while processing email job"
            );
            return false;
        }
    };

    let PasswordResetState::AwaitingCode {
        code_hash,
        code_expires_at,
        ..
    } = state
    else {
        return false;
    };

    code_hash == job.code_hash && code_expires_at == job.code_expires_at && {
        let now: DateTime<FixedOffset> = Utc::now().into();
        now <= code_expires_at
    }
}
