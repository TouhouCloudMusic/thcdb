use auth_worker::password_reset_email::Queue;
use infra_db::SeaOrmRepository;
use infra_email::Mailer;

#[derive(Clone)]
pub struct Service {
    pub(super) repo: SeaOrmRepository,
    pub(super) mailer: Mailer,
    pub(super) redis_pool: fred::prelude::Pool,
    pub(super) password_reset_email_queue: Queue,
}

impl Service {
    pub const fn new(
        repo: SeaOrmRepository,
        mailer: Mailer,
        redis_pool: fred::prelude::Pool,
        password_reset_email_queue: Queue,
    ) -> Self {
        Self {
            repo,
            mailer,
            redis_pool,
            password_reset_email_queue,
        }
    }
}
