mod cursor;
mod load;
mod query;

#[cfg(all(test, feature = "integration-test"))]
mod tests;

pub use cursor::{CreditsCursor, SongPosition};
use entity::credit_role;
use infra_db::SeaOrmRepository;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::{Itertools, izip};
use sea_orm::prelude::*;
use sea_orm::{FromQueryResult, QueryFilter};

use crate::model::{
    ArtistCreditScope, ArtistCreditSort, ArtistCredits, ArtistSongCredit,
    Credit, CreditQuery,
};

#[derive(FromQueryResult)]
struct SelectedSong {
    id: i32,
    primary_release_id: Option<i32>,
}

pub async fn credits(
    repo: &SeaOrmRepository,
    query: CreditQuery,
) -> Result<ArtistCredits, DatabaseError> {
    let CreditQuery {
        artist_id,
        cursor,
        limit,
        scope,
        sort,
        role_id,
    } = query;

    if !matches!(cursor.as_ref(), Some(CreditsCursor::Song { .. })) {
        let page = credit_page(
            repo,
            artist_id,
            cursor.as_ref(),
            limit,
            scope,
            sort,
            role_id,
        )
        .await?;
        let CreditPage {
            releases,
            songs,
            has_more_releases,
            last_release_cursor,
        } = page;
        if !releases.is_empty() {
            let next_cursor = if has_more_releases {
                last_release_cursor
            } else if !matches!(scope, ArtistCreditScope::Release)
                && query::has_orphan_songs(repo, artist_id, role_id).await?
            {
                Some(CreditsCursor::Song { after: None })
            } else {
                None
            };
            return Ok(ArtistCredits {
                release: releases,
                song: songs,
                next_cursor,
            });
        }
    }

    if matches!(scope, ArtistCreditScope::Release) {
        return Ok(ArtistCredits {
            release: Vec::new(),
            song: Vec::new(),
            next_cursor: None,
        });
    }

    let after = match cursor {
        Some(CreditsCursor::Song { after }) => after,
        _ => None,
    };
    let songs =
        orphan_song_page(repo, artist_id, after.as_ref(), limit, role_id)
            .await?;
    Ok(ArtistCredits {
        release: Vec::new(),
        song: songs.items,
        next_cursor: songs.next_cursor,
    })
}

struct CreditPage {
    releases: Vec<Credit>,
    songs: Vec<ArtistSongCredit>,
    has_more_releases: bool,
    last_release_cursor: Option<CreditsCursor>,
}

async fn credit_page(
    repo: &SeaOrmRepository,
    artist_id: i32,
    cursor: Option<&CreditsCursor>,
    limit: u8,
    scope: ArtistCreditScope,
    sort: ArtistCreditSort,
    role_id: Option<i32>,
) -> Result<CreditPage, DatabaseError> {
    let releases = query::find_credit_releases(
        query::credit_release_select(artist_id, scope, role_id),
        cursor,
        limit,
        sort,
        &repo.conn,
    )
    .await?;
    let last_release_cursor =
        releases.items.last().map(|item| CreditsCursor::Release {
            release_date: item.release.release_date,
            title: item.release.title.clone(),
            id: item.release.id,
        });
    let has_more_releases = releases.has_more;
    let release_ids = releases
        .items
        .iter()
        .map(|item| item.release.id)
        .collect_vec();

    if release_ids.is_empty() {
        return Ok(CreditPage {
            releases: Vec::new(),
            songs: Vec::new(),
            has_more_releases,
            last_release_cursor,
        });
    }

    let (release_credits, release_artists) =
        load::load_release_credit_details(repo, artist_id, scope, &release_ids)
            .await?;
    let song_data = if matches!(scope, ArtistCreditScope::Release) {
        None
    } else {
        let songs =
            query::matching_group_songs(repo, artist_id, role_id, &release_ids)
                .await?;
        Some(load::load_song_credit_data(repo, artist_id, songs).await?)
    };
    let release_credits_by_release = load::release_credits_by_release(
        &releases.items,
        &release_credits,
        &release_artists,
        artist_id,
        scope,
        role_id,
    );
    let role_ids = release_credits_by_release
        .iter()
        .flatten()
        .map(|credit| credit.role_id)
        .chain(
            song_data
                .as_ref()
                .into_iter()
                .flat_map(|data| data.items.iter())
                .flat_map(|item| item.song_credits.iter())
                .filter_map(|credit| credit.role_id),
        )
        .collect_vec();
    let credit_roles = credit_role::Entity::find()
        .filter(credit_role::Column::Id.is_in(role_ids))
        .all(&repo.conn)
        .await
        .db_operation("load artist credit roles")?;
    let credit_irs = izip!(releases.items, release_credits_by_release)
        .map(|(item, release_credits)| load::CreditIR {
            release: item.release,
            artists: item.artists,
            cover_url: item.cover_url,
            release_credits,
        })
        .collect_vec();
    let release_items = load::into_artist_credits(credit_irs, &credit_roles);
    let songs = song_data.map_or_else(Vec::new, |data| {
        load::into_group_songs(data, &release_ids, &credit_roles)
    });
    Ok(CreditPage {
        releases: release_items,
        songs,
        has_more_releases,
        last_release_cursor,
    })
}

struct SongPage {
    items: Vec<ArtistSongCredit>,
    next_cursor: Option<CreditsCursor>,
}

async fn orphan_song_page(
    repo: &SeaOrmRepository,
    artist_id: i32,
    after: Option<&SongPosition>,
    limit: u8,
    role_id: Option<i32>,
) -> Result<SongPage, DatabaseError> {
    let songs = query::find_artist_credit_songs(
        query::orphan_song_select(artist_id, role_id),
        after,
        limit,
        &repo.conn,
    )
    .await?;
    let has_more = songs.has_more;
    let selected_songs = songs
        .items
        .into_iter()
        .map(|song| SelectedSong {
            id: song.id,
            primary_release_id: None,
        })
        .collect_vec();
    let data =
        load::load_song_credit_data(repo, artist_id, selected_songs).await?;
    let role_ids = data
        .items
        .iter()
        .flat_map(|item| item.song_credits.iter())
        .filter_map(|credit| credit.role_id)
        .collect_vec();
    let credit_roles = credit_role::Entity::find()
        .filter(credit_role::Column::Id.is_in(role_ids))
        .all(&repo.conn)
        .await
        .db_operation("load artist orphan song credit roles")?;
    let items = data
        .items
        .into_iter()
        .map(|item| {
            load::into_artist_song_credit(
                item,
                &credit_roles,
                &data.releases,
                &data.discs,
            )
        })
        .collect_vec();
    let next_cursor = has_more.then(|| CreditsCursor::Song {
        after: items.last().map(|song| SongPosition {
            title: song.title.clone(),
            id: song.song_id,
        }),
    });
    Ok(SongPage { items, next_cursor })
}
