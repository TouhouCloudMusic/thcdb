use std::time::Duration;

use chrono::Utc;
use fred::prelude::{Client, ClientLike, ListInterface, Options};
use lettre::message::Mailbox;

use super::Worker;
use crate::features::auth::password_reset::{
    PASSWORD_RESET_EMAIL_QUEUE_KEY, PasswordResetEmailJob,
    build_password_reset_email_message, password_reset_email_job_is_current,
};
use crate::utils::retry_async;

pub(super) fn init(worker: &Worker) {
    let redis_pool = worker.redis_pool.clone();
    let mailer = worker.mailer.clone();
    let client = Client::clone_new(redis_pool.next()).with_options(&Options {
        timeout: Duration::from_secs(0).into(),
        ..Default::default()
    });

    tokio::spawn(async move {
        client.init().await.unwrap();
        tracing::info!("Password reset email worker started");

        loop {
            match client
                .brpop::<Option<(String, String)>, _>(
                    PASSWORD_RESET_EMAIL_QUEUE_KEY,
                    0.0,
                )
                .await
            {
                Ok(Some((_queue_key, payload))) => {
                    let job = match serde_json::from_str::<PasswordResetEmailJob>(
                        &payload,
                    ) {
                        Ok(job) => job,
                        Err(err) => {
                            tracing::error!(
                                error = ?err,
                                "Failed to deserialize password reset email job"
                            );
                            continue;
                        }
                    };

                    let now: chrono::DateTime<chrono::FixedOffset> =
                        Utc::now().into();
                    if job.code_expires_at <= now {
                        continue;
                    }

                    if !password_reset_email_job_is_current(&redis_pool, &job)
                        .await
                    {
                        continue;
                    }

                    let to: Mailbox = match job.email.parse() {
                        Ok(to) => to,
                        Err(err) => {
                            tracing::error!(
                                error = %err,
                                user_id = job.user_id,
                                "Invalid password reset recipient address"
                            );
                            continue;
                        }
                    };
                    let Some(code) =
                        crate::domain::model::VerificationCode::<6>::parse(
                            &job.code,
                        )
                    else {
                        tracing::error!(
                            user_id = job.user_id,
                            "Invalid password reset code in email job"
                        );
                        continue;
                    };
                    let message = match build_password_reset_email_message(
                        mailer.from().clone(),
                        to,
                        code,
                    ) {
                        Ok(message) => message,
                        Err(err) => {
                            tracing::error!(
                                error = ?err,
                                user_id = job.user_id,
                                "Failed to build password reset email message"
                            );
                            continue;
                        }
                    };

                    if let Err(err) = mailer.send(message).await {
                        tracing::error!(
                            error = %err,
                            user_id = job.user_id,
                            "Failed to send password reset email"
                        );
                        let pool = redis_pool.clone();
                        tokio::spawn(async move {
                            if let Err(push_err) = retry_async(
                                Duration::from_secs(1),
                                999,
                                async move || {
                                    pool.lpush::<(), _, _>(
                                        PASSWORD_RESET_EMAIL_QUEUE_KEY,
                                        payload.clone(),
                                    )
                                    .await
                                },
                            )
                            .await
                            {
                                tracing::error!(
                                    error = ?push_err,
                                    user_id = job.user_id,
                                    "Failed to requeue password reset email job"
                                );
                            }
                        });
                    }
                }
                Ok(None) => {}
                Err(err) => {
                    tracing::error!(
                        error = ?err,
                        "Password reset email worker redis error"
                    );
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use fred::types::Value;

    use super::*;

    #[test]
    fn converts_brpop_reply() {
        let payload = r#"{"user_id":1}"#.to_string();
        let reply = Value::Array(vec![
            PASSWORD_RESET_EMAIL_QUEUE_KEY.into(),
            payload.clone().into(),
        ]);

        let reply: Option<(String, String)> = reply.convert().unwrap();

        assert_eq!(
            reply,
            Some((PASSWORD_RESET_EMAIL_QUEUE_KEY.to_string(), payload))
        );
    }
}
