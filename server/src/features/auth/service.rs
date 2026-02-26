use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::email::Mailer;

#[derive(Clone)]
pub struct Service {
    pub(super) repo: SeaOrmRepository,
    pub(super) mailer: Mailer,
}

impl Service {
    pub const fn new(repo: SeaOrmRepository, mailer: Mailer) -> Self {
        Self { repo, mailer }
    }
}
