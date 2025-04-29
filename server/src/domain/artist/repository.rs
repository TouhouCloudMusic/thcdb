use crate::domain::repository::RepositoryTrait;

pub trait Repository: RepositoryTrait {
    async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<super::model::Artist>, Self::Error>;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Vec<super::model::Artist>, Self::Error>;
}
