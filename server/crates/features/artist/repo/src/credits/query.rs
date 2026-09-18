use entity::{release, release_credit, release_track, song, song_credit};
use infra_db::SeaOrmRepository;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::prelude::*;
use sea_orm::{
    ColumnTrait, ConnectionTrait, JoinType, QueryOrder, QuerySelect,
};
use sea_query::{
    Alias, Expr, ExprTrait, NullOrdering, Query, SelectStatement, SimpleExpr,
    all, any,
};

use super::SelectedSong;
use super::cursor::{CreditsCursor, SongPosition, release_after_position};
use crate::model::{ArtistCreditScope, ArtistCreditSort};
use crate::releases::{self, not_release_artist};

pub(super) struct CreditReleasePage {
    pub(super) items: Vec<crate::releases::ArtistReleaseIR>,
    pub(super) has_more: bool,
}

pub(super) async fn find_credit_releases(
    mut select: Select<release::Entity>,
    cursor: Option<&CreditsCursor>,
    limit: u8,
    sort: ArtistCreditSort,
    db: &impl ConnectionTrait,
) -> Result<CreditReleasePage, DatabaseError> {
    if let Some(CreditsCursor::Release {
        release_date,
        title,
        id,
    }) = cursor
    {
        select = select.filter(release_after_position(
            *release_date,
            title,
            *id,
            sort,
        ));
    }
    let order = match sort {
        ArtistCreditSort::Newest => sea_orm::Order::Desc,
        ArtistCreditSort::Oldest => sea_orm::Order::Asc,
    };
    let mut releases = select
        .order_by_with_nulls(
            release::Column::ReleaseDate,
            order,
            NullOrdering::Last,
        )
        .order_by_asc(release::Column::Title)
        .order_by_asc(release::Column::Id)
        .limit(u64::from(limit) + 1)
        .all(db)
        .await
        .db_operation("load artist releases")?;
    let has_more = releases.len() > usize::from(limit);
    if has_more {
        releases.pop();
    }
    let items = releases::hydrate_releases(releases, db).await?;
    Ok(CreditReleasePage { items, has_more })
}

pub(super) async fn matching_group_songs(
    repo: &SeaOrmRepository,
    artist_id: i32,
    role_id: Option<i32>,
    release_ids: &[i32],
) -> Result<Vec<SelectedSong>, DatabaseError> {
    let credit_alias = || Alias::new("artist_credit_group_song_credit");
    let mut song_credit_match = Query::select();
    song_credit_match
        .expr(1)
        .from_as(song_credit::Entity, credit_alias())
        .and_where(
            Expr::col((credit_alias(), song_credit::Column::SongId))
                .eq(Expr::col((song::Entity, song::Column::Id))),
        )
        .and_where(
            Expr::col((credit_alias(), song_credit::Column::ArtistId))
                .eq(artist_id),
        );
    if let Some(role_id) = role_id {
        song_credit_match.and_where(
            Expr::col((credit_alias(), song_credit::Column::RoleId))
                .eq(role_id),
        );
    }
    let primary_release_id = || {
        primary_release_id_subquery(
            Expr::col((song::Entity, song::Column::Id)).into(),
        )
    };
    song::Entity::find()
        .select_only()
        .column(song::Column::Id)
        .column_as(primary_release_id(), "primary_release_id")
        .filter(Expr::exists(song_credit_match))
        .filter(primary_release_id().is_in(release_ids.to_vec()))
        .order_by_asc(song::Column::Title)
        .order_by_asc(song::Column::Id)
        .into_model::<SelectedSong>()
        .all(&repo.conn)
        .await
        .db_operation("load artist grouped song credits")
}

pub(super) async fn find_artist_credit_songs(
    mut select: Select<song::Entity>,
    after: Option<&SongPosition>,
    limit: u8,
    db: &impl ConnectionTrait,
) -> Result<SongPageModels, DatabaseError> {
    if let Some(after) = after {
        select = select.filter(any![
            song::Column::Title.gt(after.title.clone()),
            all![
                song::Column::Title.eq(after.title.clone()),
                song::Column::Id.gt(after.id),
            ],
        ]);
    }
    let mut songs = select
        .order_by_asc(song::Column::Title)
        .order_by_asc(song::Column::Id)
        .limit(u64::from(limit) + 1)
        .all(db)
        .await
        .db_operation("load artist song credits")?;
    let has_more = songs.len() > usize::from(limit);
    if has_more {
        songs.pop();
    }
    Ok(SongPageModels {
        items: songs,
        has_more,
    })
}

pub(super) struct SongPageModels {
    pub(super) items: Vec<song::Model>,
    pub(super) has_more: bool,
}

pub(super) async fn has_orphan_songs(
    repo: &SeaOrmRepository,
    artist_id: i32,
    role_id: Option<i32>,
) -> Result<bool, DatabaseError> {
    orphan_song_select(artist_id, role_id)
        .limit(1)
        .one(&repo.conn)
        .await
        .db_operation("check artist orphan song credits")
        .map(|song| song.is_some())
}

pub(super) fn credit_release_select(
    artist_id: i32,
    scope: ArtistCreditScope,
    role_id: Option<i32>,
) -> Select<release::Entity> {
    let release_credit_match = release_credit_exists(artist_id, role_id);
    let song_credit_match = song_primary_release_exists(artist_id, role_id);
    let condition: SimpleExpr = match scope {
        ArtistCreditScope::All => any![
            all![
                not_release_artist(artist_id),
                Expr::exists(release_credit_match),
            ],
            Expr::exists(song_credit_match),
        ]
        .into(),
        ArtistCreditScope::Release => all![
            not_release_artist(artist_id),
            Expr::exists(release_credit_match),
        ]
        .into(),
        ArtistCreditScope::Song => Expr::exists(song_credit_match),
    };
    release::Entity::find().filter(condition)
}

fn release_credit_exists(
    artist_id: i32,
    role_id: Option<i32>,
) -> SelectStatement {
    let alias = || Alias::new("artist_credit_release_credit");
    let mut query = Query::select();
    query
        .expr(1)
        .from_as(release_credit::Entity, alias())
        .and_where(
            Expr::col((alias(), release_credit::Column::ReleaseId))
                .eq(Expr::col((release::Entity, release::Column::Id))),
        )
        .and_where(
            Expr::col((alias(), release_credit::Column::ArtistId))
                .eq(artist_id),
        );
    if let Some(role_id) = role_id {
        query.and_where(
            Expr::col((alias(), release_credit::Column::RoleId)).eq(role_id),
        );
    }
    query
}

fn song_primary_release_exists(
    artist_id: i32,
    role_id: Option<i32>,
) -> SelectStatement {
    let track_alias = || Alias::new("artist_credit_primary_track");
    let credit_alias = || Alias::new("artist_credit_song_credit");
    let mut song_credit_match = Query::select();
    song_credit_match
        .expr(1)
        .from_as(song_credit::Entity, credit_alias())
        .and_where(
            Expr::col((credit_alias(), song_credit::Column::SongId))
                .eq(Expr::col((track_alias(), release_track::Column::SongId))),
        )
        .and_where(
            Expr::col((credit_alias(), song_credit::Column::ArtistId))
                .eq(artist_id),
        );
    if let Some(role_id) = role_id {
        song_credit_match.and_where(
            Expr::col((credit_alias(), song_credit::Column::RoleId))
                .eq(role_id),
        );
    }
    let primary_release_id = primary_release_id_subquery(
        Expr::col((track_alias(), release_track::Column::SongId)).into(),
    );
    Query::select()
        .expr(1)
        .from_as(release_track::Entity, track_alias())
        .and_where(
            Expr::col((track_alias(), release_track::Column::ReleaseId))
                .eq(Expr::col((release::Entity, release::Column::Id))),
        )
        .and_where(
            Expr::col((track_alias(), release_track::Column::ReleaseId))
                .eq(primary_release_id),
        )
        .and_where(Expr::exists(song_credit_match))
        .to_owned()
}

fn primary_release_id_subquery(song_id: SimpleExpr) -> SimpleExpr {
    let track_alias = || Alias::new("artist_credit_owner_track");
    let release_alias = || Alias::new("artist_credit_owner_release");
    let mut query = Query::select();
    query
        .column((track_alias(), release_track::Column::ReleaseId))
        .from_as(release_track::Entity, track_alias())
        .join_as(
            JoinType::InnerJoin,
            release::Entity,
            release_alias(),
            Expr::col((track_alias(), release_track::Column::ReleaseId))
                .equals((release_alias(), release::Column::Id)),
        )
        .and_where(
            Expr::col((track_alias(), release_track::Column::SongId))
                .eq(song_id),
        )
        .order_by_with_nulls(
            (release_alias(), release::Column::ReleaseDate),
            sea_orm::Order::Desc,
            NullOrdering::Last,
        )
        .order_by(
            (release_alias(), release::Column::Title),
            sea_orm::Order::Asc,
        )
        .order_by((release_alias(), release::Column::Id), sea_orm::Order::Asc)
        .limit(1);
    SimpleExpr::SubQuery(None, Box::new(query.into_sub_query_statement()))
}

pub(super) fn orphan_song_select(
    artist_id: i32,
    role_id: Option<i32>,
) -> Select<song::Entity> {
    let credit_alias = || Alias::new("artist_credit_orphan_credit");
    let mut song_credit_match = Query::select();
    song_credit_match
        .expr(1)
        .from_as(song_credit::Entity, credit_alias())
        .and_where(
            Expr::col((credit_alias(), song_credit::Column::SongId))
                .eq(Expr::col((song::Entity, song::Column::Id))),
        )
        .and_where(
            Expr::col((credit_alias(), song_credit::Column::ArtistId))
                .eq(artist_id),
        );
    if let Some(role_id) = role_id {
        song_credit_match.and_where(
            Expr::col((credit_alias(), song_credit::Column::RoleId))
                .eq(role_id),
        );
    }
    let track_alias = || Alias::new("artist_credit_orphan_track");
    let mut release_track_match = Query::select();
    release_track_match
        .expr(1)
        .from_as(release_track::Entity, track_alias())
        .and_where(
            Expr::col((track_alias(), release_track::Column::SongId))
                .eq(Expr::col((song::Entity, song::Column::Id))),
        );
    song::Entity::find().filter(all![
        Expr::exists(song_credit_match),
        ExprTrait::not(Expr::exists(release_track_match)),
    ])
}
