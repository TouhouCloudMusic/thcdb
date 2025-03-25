pub trait Repository: Send + Sync {
    type Error;

    async fn create(
        &self,
        data: entity::image::ActiveModel,
    ) -> Result<entity::image::Model, Self::Error>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error>;
}
