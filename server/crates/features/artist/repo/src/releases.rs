use domain::image::Image;
use domain::shared::{Cursor, CursorResponse, DateWithPrecision};
use entity::artist::{self};
use entity::enums::ReleaseImageType;
use entity::{
    release, release_artist, release_image, release_track, release_track_artist,
};
use infra_db::SeaOrmRepository;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::{Itertools, izip};
use libfp::FunctorExt;
use sea_orm::prelude::*;
use sea_orm::{ConnectionTrait, QueryOrder, QuerySelect, QueryTrait};
use sea_query::{
    Alias, Expr, ExprTrait, NullOrdering, Query, SelectStatement, SimpleExpr,
    all, any,
};

use crate::model::{
    Appearance, AppearanceQuery, ArtistReleaseArtist, Discography,
    DiscographyQuery,
};

pub(crate) struct ArtistReleaseIR {
    pub(crate) release: release::Model,
    pub(crate) artists: Vec<artist::Model>,
    pub(crate) cover_url: Option<String>,
}

pub async fn appearance(
    repo: &SeaOrmRepository,
    query: AppearanceQuery,
) -> Result<CursorResponse<Appearance>, DatabaseError> {
    find_artist_releases(
        appearance_select(query.artist_id),
        query.pagination,
        &repo.conn,
    )
    .await
    .map(|x| x.map(Into::into))
}

pub async fn discography(
    repo: &SeaOrmRepository,
    query: DiscographyQuery,
) -> Result<CursorResponse<Discography>, DatabaseError> {
    let select = release::Entity::find()
        .filter(release::Column::ReleaseType.eq(query.release_type))
        .filter(release_artist::Column::ArtistId.eq(query.artist_id))
        .left_join(release_artist::Entity);

    find_artist_releases(select, query.pagination, &repo.conn)
        .await
        .map(|x| x.map(Into::into))
}

async fn find_artist_releases(
    select: Select<release::Entity>,
    pagination: Cursor,
    db: &impl ConnectionTrait,
) -> Result<CursorResponse<ArtistReleaseIR>, DatabaseError> {
    let mut select = select;
    if pagination.at > 0 {
        select = select
            .filter(Expr::exists(release_after_cursor_subquery(pagination.at)));
    }
    let mut releases = select
        .order_by_with_nulls(
            release::Column::ReleaseDate,
            sea_orm::Order::Desc,
            NullOrdering::Last,
        )
        .order_by_asc(release::Column::Title)
        .order_by_asc(release::Column::Id)
        .limit(u64::from(pagination.limit) + 1)
        .all(db)
        .await
        .db_operation("load artist releases")?;
    let has_more = releases.len() > usize::from(pagination.limit);
    if has_more {
        releases.pop();
    }
    let items = hydrate_releases(releases, db).await?;
    let next_cursor = items
        .last()
        .and_then(|item| has_more.then_some(item.release.id));
    Ok(CursorResponse { items, next_cursor })
}

pub(crate) async fn hydrate_releases(
    releases: Vec<release::Model>,
    db: &impl ConnectionTrait,
) -> Result<Vec<ArtistReleaseIR>, DatabaseError> {
    let Some(_) = releases.last() else {
        return Ok(Vec::new());
    };
    let release_artist = releases
        .load_many_to_many(artist::Entity::find(), release_artist::Entity, db)
        .await
        .db_operation("load artist release artists")?;
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
        .await
        .db_operation("load artist release cover images")?
        .into_iter()
        .map(|x| x.into_iter().next().map(Image::from).map(|x| x.url()))
        .collect_vec();
    Ok(izip!(releases, release_artist, cover_urls)
        .map(|(release, artists, cover_url)| ArtistReleaseIR {
            release,
            artists,
            cover_url,
        })
        .collect_vec())
}

fn release_after_cursor_subquery(cursor: i32) -> SelectStatement {
    let cursor_release = || Alias::new("cursor_release");
    let cursor_date =
        || Expr::col((cursor_release(), release::Column::ReleaseDate));
    let release_date = || release::Column::ReleaseDate.into_expr();
    let same_release_date = any![
        release_date().eq(cursor_date()),
        all![release_date().is_null(), cursor_date().is_null()],
    ];
    let title_or_id_after_cursor = Expr::tuple([
        release::Column::Title.into_expr().into(),
        release::Column::Id.into_expr().into(),
    ])
    .gt(Expr::tuple([
        Expr::col((cursor_release(), release::Column::Title)).into(),
        Expr::col((cursor_release(), release::Column::Id)).into(),
    ]));
    let date_after_cursor = any![
        release_date().lt(cursor_date()),
        all![release_date().is_null(), cursor_date().is_not_null()],
    ];
    Query::select()
        .expr(1)
        .from_as(release::Entity, cursor_release())
        .and_where(
            Expr::col((cursor_release(), release::Column::Id)).eq(cursor),
        )
        .cond_where(any![
            date_after_cursor,
            all![same_release_date, title_or_id_after_cursor]
        ])
        .to_owned()
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
    release::Entity::find().filter(all![
        not_release_artist(artist_id),
        Expr::exists(release_track_artist_subquery.into_query()),
    ])
}

pub(crate) fn not_release_artist(artist_id: i32) -> SimpleExpr {
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
    ExprTrait::not(Expr::exists(subquery))
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
        Self {
            release_id: release.id,
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
        Self {
            id: artist.id,
            name: artist.name,
        }
    }
}
