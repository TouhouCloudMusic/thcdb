use infra_db::SeaOrmRepository;

#[derive(Clone)]
pub struct Service {
    pub(super) repo: SeaOrmRepository,
}

impl Service {
    #[must_use]
    pub const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }
}
