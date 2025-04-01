use super::RepositoryTrait;
use crate::domain::model;

pub trait Repository: RepositoryTrait {
    type Error;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<entity::user::Model>, Self::Error>;
}

pub trait ProfileRepository: RepositoryTrait {
    type Error;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<model::user::UserProfile>, Self::Error>;
}
