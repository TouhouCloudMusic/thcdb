use std::time::Duration;

use apalis::prelude::{Attempt, Data, TaskId};
use apalis_redis::RedisContext;
use chrono::Utc;
use lettre::message::Mailbox;

use crate::features::auth::password_reset::{
    PasswordResetEmailJob, build_password_reset_email_message,
    password_reset_email_job_is_current,
};
use crate::infra::worker::{WorkerState, reschedule_job};

pub(super) async fn handle(
    job: PasswordResetEmailJob,
    state: Data<WorkerState>,
    task_id: TaskId,
    attempt: Attempt,
    context: RedisContext,
) -> Result<(), std::io::Error> {
    let now: chrono::DateTime<chrono::FixedOffset> = Utc::now().into();
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
                target: "infra.worker.password_reset_email",
                user_id = job.user_id,
                error:% = err;
                "invalid password reset recipient address"
            );
            return Ok(());
        }
    };
    let Some(code) =
        crate::domain::model::VerificationCode::<6>::parse(&job.code)
    else {
        log::error!(
            target: "infra.worker.password_reset_email",
            user_id = job.user_id;
            "invalid password reset code in email job"
        );
        return Ok(());
    };
    let message = match build_password_reset_email_message(
        state.mailer.from().clone(),
        to,
        code,
    ) {
        Ok(message) => message,
        Err(err) => {
            log::error!(
                target: "infra.worker.password_reset_email",
                user_id = job.user_id,
                error:? = err;
                "failed to build password reset email message"
            );
            return Ok(());
        }
    };

    if let Err(err) = state.mailer.send(message).await {
        log::error!(
            target: "infra.worker.password_reset_email",
            user_id = job.user_id,
            error:% = err;
            "failed to send password reset email"
        );
        let user_id = job.user_id;
        let mut queue = state.password_reset_email_queue.clone();
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
                target: "infra.worker.password_reset_email",
                user_id = user_id,
                error:? = push_err;
                "failed to reschedule password reset email job"
            );
            std::io::Error::other(push_err.to_string())
        });
    }

    Ok(())
}
