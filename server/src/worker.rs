use std::error::Error as StdError;

use auth_worker::password_reset_email::{
    self, PasswordResetEmailMailer, PasswordResetEmailQueue,
};
use auth_worker::sign_up_cleanup;
use infra_db::SeaOrmRepository;
use infra_storage_worker as remove_file_worker;
use infra_storage_worker::RemoveFileQueue;
use infra_worker::{
    CronStream, Data, Monitor, WorkerBuilder, WorkerBuilderExt,
    WorkerFactoryFn, spawn_monitor,
};
use lettre::message::{Mailbox, Message as EmailMessage};
use notification_worker::cleanup as notification_cleanup;

use crate::infra::email::Mailer;

pub struct Worker {
    pub redis_pool: fred::prelude::Pool,
    pub repo: SeaOrmRepository,
    pub mailer: Mailer,
    pub notification_retention_days: i64,
    pub password_reset_email_queue: PasswordResetEmailQueue,
    pub remove_file_queue: RemoveFileQueue,
}

impl PasswordResetEmailMailer for Mailer {
    fn from(&self) -> &Mailbox {
        self.from()
    }

    async fn send(
        &self,
        message: EmailMessage,
    ) -> Result<(), Box<dyn StdError + Send + Sync>> {
        Mailer::send(self, message)
            .await
            .map_err(|err| Box::new(err) as Box<dyn StdError + Send + Sync>)
    }
}

impl Worker {
    pub fn init(self) {
        let Self {
            redis_pool,
            repo,
            mailer,
            notification_retention_days,
            password_reset_email_queue,
            remove_file_queue,
        } = self;

        let remove_file_state = Data::new(remove_file_worker::WorkerState {
            queue: remove_file_queue.clone(),
        });
        let sign_up_cleanup_state =
            Data::new(sign_up_cleanup::WorkerState { repo: repo.clone() });
        let password_reset_email_state =
            Data::new(password_reset_email::WorkerState {
                redis_pool,
                mailer,
                queue: password_reset_email_queue.clone(),
            });
        let notification_cleanup_state =
            Data::new(notification_cleanup::WorkerState {
                repo,
                retention_days: notification_retention_days,
            });

        let immediate_sign_up_cleanup_state = sign_up_cleanup_state.clone();
        tokio::spawn(async move {
            sign_up_cleanup::handle(
                sign_up_cleanup::UnverifiedUserCleanupJob,
                immediate_sign_up_cleanup_state,
            )
            .await;
        });

        let immediate_notification_cleanup_state =
            notification_cleanup_state.clone();
        tokio::spawn(async move {
            notification_cleanup::handle(
                notification_cleanup::NotificationCleanupJob,
                immediate_notification_cleanup_state,
            )
            .await;
        });

        let monitor = Monitor::new()
            .register(
                WorkerBuilder::new("remove_file")
                    .data(remove_file_state)
                    .enable_tracing()
                    .backend(remove_file_queue)
                    .build_fn(remove_file_worker::handle),
            )
            .register(
                WorkerBuilder::new("unverified_user_cleanup")
                    .data(sign_up_cleanup_state)
                    .enable_tracing()
                    .backend(CronStream::new(sign_up_cleanup::schedule()))
                    .build_fn(sign_up_cleanup::handle),
            )
            .register(
                WorkerBuilder::new("password_reset_email")
                    .data(password_reset_email_state)
                    .enable_tracing()
                    .backend(password_reset_email_queue)
                    .build_fn(password_reset_email::handle::<Mailer>),
            )
            .register(
                WorkerBuilder::new("notification_cleanup")
                    .data(notification_cleanup_state)
                    .enable_tracing()
                    .backend(CronStream::new(notification_cleanup::schedule()))
                    .build_fn(notification_cleanup::handle),
            );

        spawn_monitor(monitor.run(), "worker");
    }
}
