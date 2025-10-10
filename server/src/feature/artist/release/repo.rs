use sea_orm::ConnectionTrait;

use crate::domain::artist_release::{
    Appearance, AppearanceQuery, Credit, CreditQuery, Discography,
    DiscographyQuery,
};
use crate::domain::{Connection, Paginated};
use crate::infra::database::sea_orm::artist_release as infra;

pub(super) async fn appearance<R>(
    repo: &R,
    query: AppearanceQuery,
) -> Result<Paginated<Appearance>, sea_orm::DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    infra::appearance(repo, query).await
}

pub(super) async fn credit<R>(
    repo: &R,
    query: CreditQuery,
) -> Result<Paginated<Credit>, sea_orm::DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    infra::credit(repo, query).await
}

pub(super) async fn discography<R>(
    repo: &R,
    query: DiscographyQuery,
) -> Result<Paginated<Discography>, sea_orm::DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    infra::discography(repo, query).await
}
