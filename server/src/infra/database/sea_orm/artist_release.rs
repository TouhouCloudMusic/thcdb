use boolinator::Boolinator;
use entity::artist::{self};
use entity::{
    credit_role, release, release_artist, release_credit, release_track,
    release_track_artist,
};
use itertools::{Itertools, izip};
use sea_orm::JoinType::*;
use sea_orm::prelude::*;
use sea_orm::{QuerySelect, QueryTrait};
use sea_query::{Cond, ExprTrait, IntoCondition, SimpleExpr};

use super::SeaOrmRepository;
use crate::domain::artist_release::*;
use crate::domain::repository::{Connection, Cursor, Paginated};
use crate::domain::shared::model::{CreditRole, DateWithPrecision};
use crate::infra;
use crate::utils::MapInto;

impl Repo for SeaOrmRepository {
    async fn appearance(
        &self,
        query: AppearanceQuery,
    ) -> infra::Result<Paginated<Appearance>> {
        find_artist_releases(
            appearance_select(query.artist_id),
            query.pagination,
            self.conn(),
        )
        .await
        .map(|x| x.map_items(Into::into))
    }

    async fn credit(
        &self,
        query: CreditQuery,
    ) -> infra::Result<Paginated<Credit>> {
        let releases_and_artists = find_artist_releases(
            credit_select(query.artist_id),
            query.pagination,
            self.conn(),
        )
        .await?;

        let (releases, artists): (
            Vec<release::Model>,
            Vec<Vec<artist::Model>>,
        ) = releases_and_artists.items.into_iter().unzip();

        let release_credits = releases
            .load_many(
                release_credit::Entity::find().filter(
                    release_credit::Column::ArtistId.eq(query.artist_id),
                ),
                self.conn(),
            )
            .await?;

        let role_ids = release_credits
            .iter()
            .flatten()
            .map(|x| x.role_id)
            .collect_vec();

        let credit_roles = credit_role::Entity::find()
            .filter(credit_role::Column::Id.is_in(role_ids))
            .all(self.conn())
            .await?;

        let items = into_artist_credits(
            releases,
            artists,
            release_credits,
            &credit_roles,
        );

        Ok(Paginated {
            items,
            next_cursor: releases_and_artists.next_cursor,
        })
    }

    async fn discography(
        &self,
        query: DiscographyQuery,
    ) -> infra::Result<Paginated<Discography>> {
        let select = release::Entity::find()
            .filter(release::Column::ReleaseType.eq(query.release_type))
            .filter(release_artist::Column::ArtistId.eq(query.artist_id))
            .left_join(release_artist::Entity);

        find_artist_releases(select, query.pagination, self.conn())
            .await
            .map(|x| x.map_items(Into::into))
    }
}

async fn find_artist_releases(
    select: Select<release::Entity>,
    pagination: Cursor,
    db: &impl ConnectionTrait,
) -> infra::Result<Paginated<(release::Model, Vec<artist::Model>)>> {
    let mut cursor = select.cursor_by(release::Column::Id);

    cursor.after(pagination.at);

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
        .load_many_to_many(artist::Entity::find(), release_artist::Entity, db)
        .await?;

    let items = izip!(releases, release_artist).collect_vec();

    Ok(Paginated { items, next_cursor })
}

impl From<(release::Model, Vec<artist::Model>)> for Discography {
    fn from((release, artists): (release::Model, Vec<artist::Model>)) -> Self {
        let artist = artists.map_into();

        let release_date = DateWithPrecision::from_option(
            release.release_date,
            release.release_date_precision,
        );

        Discography {
            title: release.title,
            artist,
            release_date,
            release_type: release.release_type,
        }
    }
}

impl From<artist::Model> for ArtistReleaseArtist {
    fn from(artist: artist::Model) -> Self {
        ArtistReleaseArtist {
            id: artist.id,
            name: artist.name,
        }
    }
}

fn into_credit_roles(
    models: Vec<release_credit::Model>,
    roles: &[credit_role::Model],
) -> Vec<CreditRole> {
    models
        .into_iter()
        .map(|model| {
            let role = roles
                .iter()
                .find(|role| role.id == model.role_id)
                .expect("Always has credit roles");
            CreditRole {
                id: model.role_id,
                name: role.name.clone(),
            }
        })
        .collect_vec()
}

fn into_artist_credits(
    releases: Vec<release::Model>,
    artists: Vec<Vec<artist::Model>>,
    release_credits: Vec<Vec<release_credit::Model>>,
    credit_roles: &[credit_role::Model],
) -> Vec<Credit> {
    izip!(releases, artists, release_credits)
        .map(|(release, artists, release_credits)| {
            let roles = into_credit_roles(release_credits, credit_roles);

            let artist = artists.map_into();

            Credit {
                title: release.title,
                artist,
                release_date: DateWithPrecision::from_option(
                    release.release_date,
                    release.release_date_precision,
                ),
                release_type: release.release_type,
                roles,
            }
        })
        .collect_vec()
}

fn appearance_select(artist_id: i32) -> Select<release::Entity> {
    let release_track_artist_subquery = release_track_artist::Entity::find()
        .select_only()
        .expr(1)
        .inner_join(release_track::Entity)
        .filter(Expr::eq(
            Expr::col((
                release_track::Entity,
                release_track::Column::ReleaseId,
            )),
            Expr::col((release::Entity, release::Column::Id)),
        ))
        .filter(release_track_artist::Column::ArtistId.eq(artist_id));

    release::Entity::find().filter(
        Cond::all()
            .add(not_release_artist(artist_id))
            .add(Expr::exists(release_track_artist_subquery.into_query())),
    )
}

fn credit_select(artist_id: i32) -> Select<release::Entity> {
    release::Entity::find()
        .join(
            InnerJoin,
            release_credit::Relation::Release.def().rev().on_condition(
                move |_, _| {
                    release_credit::Column::ArtistId
                        .eq(artist_id)
                        .into_condition()
                },
            ),
        )
        .filter(not_release_artist(artist_id))
}

fn not_release_artist(artist_id: i32) -> SimpleExpr {
    let subquery = release_artist::Entity::find()
        .select_only()
        .expr(1)
        .filter(Expr::eq(
            Expr::col((
                release_artist::Entity,
                release_artist::Column::ReleaseId,
            )),
            Expr::col((release::Entity, release::Column::Id)),
        ))
        .filter(release_artist::Column::ArtistId.eq(artist_id))
        .into_query();

    // TODO: replace with Expr::not after pr merged
    ExprTrait::not(Expr::exists(subquery))
}
