use crate::domain::model::image::{Image, NewImage};
use crate::domain::repository::RepositoryTrait;

pub trait Repository: RepositoryTrait {
    async fn save(&self, new_image: NewImage) -> Result<Image, Self::Error>;

    async fn delete(&self, id: i32) -> Result<(), Self::Error>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, Self::Error>;
}
