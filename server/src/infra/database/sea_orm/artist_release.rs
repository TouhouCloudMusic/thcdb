use boolinator::Boolinator;
use entity::artist::{self};
use entity::{release, release_artist};
use itertools::{Itertools, izip};
use sea_orm::prelude::*;
use sea_orm::{Condition, QuerySelect};
use sea_orm_migration::prelude::Cond;

use super::SeaOrmRepository;
use crate::domain::artist_release::*;
use crate::domain::repository::{Connection, Paginated, Pagination};
use crate::domain::shared::model::DateWithPrecision;
use crate::infra;

impl Repo for SeaOrmRepository {
    async fn appearance(
        &self,
        query: AppearanceQuery,
    ) -> infra::Result<Paginated<ArtistRelease>> {
        find_artist_release_impl(&query, query.pagination, self.conn()).await
    }

    async fn credit(
        &self,
        query: CreditQuery,
    ) -> infra::Result<Paginated<ArtistRelease>> {
        find_artist_release_impl(&query, query.pagination, self.conn()).await
    }

    async fn discography(
        &self,
        query: DiscographyQuery,
    ) -> infra::Result<Paginated<ArtistRelease>> {
        find_artist_release_impl(&query, query.pagination, self.conn()).await
    }
}

async fn find_artist_release_impl(
    cond: impl Into<Cond>,
    pagination: Pagination,
    db: &impl ConnectionTrait,
) -> infra::Result<Paginated<ArtistRelease>> {
    let mut cursor = release::Entity::find()
        .select_only()
        .columns([
            release::Column::Id,
            release::Column::Title,
            release::Column::ReleaseDate,
            release::Column::ReleaseDatePrecision,
            release::Column::ReleaseType,
        ])
        .filter(cond.into())
        .cursor_by(release::Column::Id);

    cursor.after(pagination.cursor);

    // Get one more to check if there are more
    let mut releases =
        cursor.first((pagination.limit + 1).into()).all(db).await?;

    let has_more = releases.len() > pagination.limit.into();

    if has_more {
        releases.pop();
    }

    let next_cursor = match releases.last().map(|x| x.id) {
        Some(last_release_id) => has_more.as_some(last_release_id),
        // Should never happen
        None => {
            return Ok(Paginated::nothing());
        }
    };

    let release_artist = releases
        .load_many_to_many(
            artist::Entity::find()
                .select_only()
                .columns([artist::Column::Id, artist::Column::Name]),
            release_artist::Entity,
            db,
        )
        .await?;

    let items: Vec<ArtistRelease> = izip!(releases, release_artist)
        .map(to_artist_release)
        .collect_vec();

    Ok(Paginated { items, next_cursor })
}

fn to_artist_release(
    (release, artists): (release::Model, Vec<artist::Model>),
) -> ArtistRelease {
    let artist = artists
        .into_iter()
        .map(|artist| ArtistReleaseArtist {
            id: artist.id,
            name: artist.name,
        })
        .collect_vec();

    let release_date = release.release_date.map(|x| DateWithPrecision {
        value: x,
        precision: release.release_date_precision,
    });

    ArtistRelease {
        title: release.title,
        artist,
        release_date,
        release_type: release.release_type,
    }
}

impl From<&AppearanceQuery> for Condition {
    fn from(AppearanceQuery { artist_id, .. }: &AppearanceQuery) -> Self {
        Cond::all().add(release_artist::Column::ArtistId.eq(*artist_id))
    }
}

impl From<&CreditQuery> for Condition {
    fn from(CreditQuery { artist_id, .. }: &CreditQuery) -> Self {
        Cond::all().add(release_artist::Column::ArtistId.eq(*artist_id))
    }
}

impl From<&DiscographyQuery> for Condition {
    fn from(
        DiscographyQuery {
            artist_id,
            release_type,
            ..
        }: &DiscographyQuery,
    ) -> Self {
        Cond::all()
            .add(release_artist::Column::ArtistId.eq(*artist_id))
            .add(release::Column::ReleaseType.eq(*release_type))
    }
}
