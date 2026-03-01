use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::email::Mailer;

#[derive(Clone)]
pub struct Service {
    pub(super) repo: SeaOrmRepository,
    pub(super) mailer: Mailer,
    pub(super) redis_pool: fred::prelude::Pool,
}

impl Service {
    pub const fn new(
        repo: SeaOrmRepository,
        mailer: Mailer,
        redis_pool: fred::prelude::Pool,
    ) -> Self {
        Self {
            repo,
            mailer,
            redis_pool,
        }
    }
}
