use auth_worker::password_reset_email::PasswordResetEmailQueue;
use infra_db::SeaOrmRepository;

use crate::infra::email::Mailer;

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
