use crate::domain::{model, repository};
use crate::error::InternalError;
use crate::utils::MapInto;

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
    R::Error: Into<InternalError>,
{
    pub async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<model::user::UserProfile>, InternalError> {
        self.repo.find_by_name(name).await.map_into()
    }

    pub async fn with_following(
        &self,
        profile: &mut model::user::UserProfile,
        current_user: &model::user::User,
    ) -> Result<(), InternalError> {
        self.repo
            .with_following(profile, current_user)
            .await
            .map_into()
    }
}
