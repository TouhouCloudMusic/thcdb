use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::email::Mailer;
use crate::infra::worker::PasswordResetEmailQueue;

#[derive(Clone)]
pub struct Service {
    pub(super) repo: SeaOrmRepository,
    pub(super) mailer: Mailer,
    pub(super) redis_pool: fred::prelude::Pool,
    pub(super) password_reset_email_queue: PasswordResetEmailQueue,
}

impl Service {
    pub const fn new(
        repo: SeaOrmRepository,
        mailer: Mailer,
        redis_pool: fred::prelude::Pool,
        password_reset_email_queue: PasswordResetEmailQueue,
    ) -> Self {
        Self {
            repo,
            mailer,
            redis_pool,
            password_reset_email_queue,
        }
    }
}
