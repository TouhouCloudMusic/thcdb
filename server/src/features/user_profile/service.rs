use crate::domain::user::{ProfileRepository, User, UserProfile};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::error::Error;

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, Error> {
        self.repo.find_by_name(name).await.map_err(Error::from)
    }

    pub async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &User,
    ) -> Result<(), Error> {
        self.repo
            .with_following(profile, current_user)
            .await
            .map_err(Error::from)
    }
}
