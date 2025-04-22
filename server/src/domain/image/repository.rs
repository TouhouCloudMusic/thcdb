use crate::domain;
use crate::domain::repository::RepositoryTrait;

pub trait Repository: RepositoryTrait {
    async fn save(
        &self,
        data: domain::model::image::Image,
    ) -> Result<entity::image::Model, Self::Error>;

    async fn save_in_tx(
        &self,
        tx: &mut Self::Transaction,
        data: domain::model::image::Image,
    ) -> Result<entity::image::Model, Self::Error>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error>;
}
