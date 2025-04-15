use crate::domain::{model, repository};

#[derive(Clone)]
pub struct Profile<R> {
    repo: R,
}

impl<R> Profile<R> {
    pub const fn new(repo: R) -> Self {
        Self { repo }
    }
}

impl<R> Profile<R>
where
    R: repository::user::ProfileRepository,
{
    pub async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<model::user::UserProfile>, R::Error> {
        self.repo.find_by_name(name).await
    }

    pub async fn with_following(
        &self,
        profile: &mut model::user::UserProfile,
        current_user: &model::user::User,
    ) -> Result<(), R::Error> {
        self.repo.with_following(profile, current_user).await
    }
}
