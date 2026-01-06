use entity::artist::{self};
use entity::enums::ReleaseImageType;
use entity::{
    credit_role, release, release_artist, release_credit, release_image,
    release_track, release_track_artist,
};
use itertools::{Itertools, izip};
use libfp::FunctorExt;
use sea_orm::JoinType::*;
use sea_orm::prelude::*;
use sea_orm::{ConnectionTrait, DbErr, QuerySelect, QueryTrait};
use sea_query::{Cond, ExprTrait, IntoCondition, SimpleExpr};

use crate::domain::artist_release::*;
use crate::domain::credit_role::CreditRoleRef;
use crate::domain::image::Image;
use crate::domain::shared::DateWithPrecision;
use crate::domain::{Cursor, Paginated};
use crate::infra::database::sea_orm::SeaOrmRepository;

struct ArtistReleaseIR {
    release: release::Model,
    artists: Vec<artist::Model>,
    cover_url: Option<String>,
}

struct CreditIR {
    release: release::Model,
    artists: Vec<artist::Model>,
    cover_url: Option<String>,
    release_credits: Vec<release_credit::Model>,
}

pub(crate) async fn appearance(
    repo: &SeaOrmRepository,
    query: AppearanceQuery,
) -> Result<Paginated<Appearance>, DbErr> {
    find_artist_releases(
        appearance_select(query.artist_id),
        query.pagination,
        &repo.conn,
    )
    .await
    .map(|x| x.map_items(Into::into))
}

pub(crate) async fn credit(
    repo: &SeaOrmRepository,
    query: CreditQuery,
) -> Result<Paginated<Credit>, DbErr> {
    let releases_and_artists = find_artist_releases(
        credit_select(query.artist_id),
        query.pagination,
        &repo.conn,
    )
    .await?;

    let Paginated { items, next_cursor } = releases_and_artists;

    let (releases, (artists, cover_urls)): (Vec<_>, (Vec<_>, Vec<_>)) = items
        .into_iter()
        .map(|x| {
            let release = x.release;
            let artists = x.artists;
            let cover_url = x.cover_url;

            (release, (artists, cover_url))
        })
        .unzip();

    let release_credits = releases
        .load_many(
            release_credit::Entity::find()
                .filter(release_credit::Column::ArtistId.eq(query.artist_id)),
            &repo.conn,
        )
        .await?;

    let role_ids = release_credits
        .iter()
        .flatten()
        .map(|x| x.role_id)
        .collect_vec();

    let credit_roles = credit_role::Entity::find()
        .filter(credit_role::Column::Id.is_in(role_ids))
        .all(&repo.conn)
        .await?;

    let credit_irs = izip!(releases, artists, cover_urls, release_credits)
        .map(|(release, artists, cover_url, release_credits)| CreditIR {
            release,
            artists,
            cover_url,
            release_credits,
        })
        .collect_vec();

    let items = into_artist_credits(credit_irs, &credit_roles);

    Ok(Paginated { items, next_cursor })
}

pub(crate) async fn discography(
    repo: &SeaOrmRepository,
    query: DiscographyQuery,
) -> Result<Paginated<Discography>, DbErr> {
    let select = release::Entity::find()
        .filter(release::Column::ReleaseType.eq(query.release_type))
        .filter(release_artist::Column::ArtistId.eq(query.artist_id))
        .left_join(release_artist::Entity);

    find_artist_releases(select, query.pagination, &repo.conn)
        .await
        .map(|x| x.map_items(Into::into))
}

async fn find_artist_releases(
    select: Select<release::Entity>,
    pagination: Cursor,
    db: &impl ConnectionTrait,
) -> Result<Paginated<ArtistReleaseIR>, DbErr> {
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
        Some(last_release_id) => has_more.then_some(last_release_id),
        // Should never happen
        None => {
            return Ok(Paginated::nothing());
        }
    };

    let release_artist = releases
        .load_many_to_many(artist::Entity::find(), release_artist::Entity, db)
        .await?;

    let cover_urls = releases
        .load_many_to_many(
            entity::image::Entity::find()
                .left_join(release_image::Entity)
                .filter(
                    release_image::Column::Type.eq(ReleaseImageType::Cover),
                ),
            release_image::Entity,
            db,
        )
        .await?
        .into_iter()
        .map(|x| x.into_iter().next().map(Image::from).map(|x| x.url()))
        .collect_vec();

    let items = izip!(releases, release_artist, cover_urls)
        .map(|x| ArtistReleaseIR {
            release: x.0,
            artists: x.1,
            cover_url: x.2,
        })
        .collect_vec();

    Ok(Paginated { items, next_cursor })
}

impl From<ArtistReleaseIR> for Discography {
    fn from(
        ArtistReleaseIR {
            release,
            artists,
            cover_url,
        }: ArtistReleaseIR,
    ) -> Self {
        let artist = artists.fmap_into();

        let release_date = DateWithPrecision::from_option(
            release.release_date,
            release.release_date_precision,
        );

        Discography {
            title: release.title,
            artist,
            release_date,
            release_type: release.release_type,
            cover_url,
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
) -> Vec<CreditRoleRef> {
    models
        .into_iter()
        .map(|model| {
            let role = roles
                .iter()
                .find(|role| role.id == model.role_id)
                .expect("Always has credit roles");
            CreditRoleRef {
                id: model.role_id,
                name: role.name.clone(),
            }
        })
        .collect_vec()
}

fn into_artist_credits(
    ir: Vec<CreditIR>,
    credit_roles: &[credit_role::Model],
) -> Vec<Credit> {
    ir.into_iter()
        .map(
            |CreditIR {
                 release,
                 artists,
                 cover_url,
                 release_credits,
             }| {
                let roles = into_credit_roles(release_credits, credit_roles);

                let artist = artists.fmap_into();

                Credit {
                    title: release.title,
                    artist,
                    release_date: DateWithPrecision::from_option(
                        release.release_date,
                        release.release_date_precision,
                    ),
                    release_type: release.release_type,
                    roles,
                    cover_url,
                }
            },
        )
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
