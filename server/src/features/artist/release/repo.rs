use crate::domain::CursorResponse;
use crate::features::artist::model::{
    Appearance, AppearanceQuery, Credit, CreditQuery, Discography,
    DiscographyQuery,
};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{
    SeaOrmRepository, artist_release as infra,
};

pub(super) async fn appearance(
    repo: &SeaOrmRepository,
    query: AppearanceQuery,
) -> Result<CursorResponse<Appearance>, DatabaseError> {
    infra::appearance(repo, query)
        .await
        .with_operation("find artist appearances")
}

pub(super) async fn credit(
    repo: &SeaOrmRepository,
    query: CreditQuery,
) -> Result<CursorResponse<Credit>, DatabaseError> {
    infra::credit(repo, query)
        .await
        .with_operation("find artist credits")
}

pub(super) async fn discography(
    repo: &SeaOrmRepository,
    query: DiscographyQuery,
) -> Result<CursorResponse<Discography>, DatabaseError> {
    infra::discography(repo, query)
        .await
        .with_operation("find artist discography")
}
