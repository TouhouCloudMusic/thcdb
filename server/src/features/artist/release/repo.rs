use crate::domain::Paginated;
use crate::features::artist::model::{
    Appearance, AppearanceQuery, Credit, CreditQuery, Discography,
    DiscographyQuery,
};
use crate::infra::database::sea_orm::{
    SeaOrmRepository, artist_release as infra,
};

pub(super) async fn appearance(
    repo: &SeaOrmRepository,
    query: AppearanceQuery,
) -> Result<Paginated<Appearance>, sea_orm::DbErr> {
    infra::appearance(repo, query).await
}

pub(super) async fn credit(
    repo: &SeaOrmRepository,
    query: CreditQuery,
) -> Result<Paginated<Credit>, sea_orm::DbErr> {
    infra::credit(repo, query).await
}

pub(super) async fn discography(
    repo: &SeaOrmRepository,
    query: DiscographyQuery,
) -> Result<Paginated<Discography>, sea_orm::DbErr> {
    infra::discography(repo, query).await
}
