use libfp::BifunctorExt;

use crate::domain::user;
use crate::domain::user::{User, UserProfile};
use crate::infra::error::Error;

#[derive(Clone)]
pub struct Service<R> {
    repo: R,
}

impl<R> Service<R> {
    pub const fn new(repo: R) -> Self {
        Self { repo }
    }
}

impl<R> Service<R>
where
    R: user::ProfileRepository,
{
    pub async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, Error> {
        self.repo.find_by_name(name).await.bimap_into()
    }

    pub async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &User,
    ) -> Result<(), Error> {
        self.repo
            .with_following(profile, current_user)
            .await
            .bimap_into()
    }
}
