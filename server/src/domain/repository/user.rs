use crate::domain::model::user::User;
use crate::domain::model::{self};

pub trait Repository: Send + Sync {
    type Error;

    async fn create(&self, user: User) -> Result<User, Self::Error>;

    async fn find_by_id(&self, id: i32) -> Result<Option<User>, Self::Error>;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<User>, Self::Error>;
}

pub trait ProfileRepository: Send + Sync {
    type Error;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<model::user::UserProfile>, Self::Error>;
}
