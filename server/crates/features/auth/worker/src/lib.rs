#![expect(clippy::missing_errors_doc)]

use infra_db::SeaOrmRepository;
use infra_worker::Monitor;

pub mod password_reset_email;
pub mod sign_up_cleanup;

pub fn register_workers(
    monitor: Monitor,
    repo: SeaOrmRepository,
    redis_pool: fred::prelude::Pool,
    mailer: infra_email::Mailer,
    queue: password_reset_email::Queue,
) -> Monitor {
    let monitor = sign_up_cleanup::register_worker(monitor, repo);
    password_reset_email::register_worker(
        monitor,
        redis_pool,
        password_reset_email::Sender { mailer },
        queue,
    )
}
