use super::model::NewArtist;
pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &NewArtist,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &NewArtist,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        data: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
