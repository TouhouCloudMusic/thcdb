use domain::credit_role::CreditRoleRef;
use domain::shared::DateWithPrecision;
use entity::{
    artist, credit_role, release, release_artist, release_credit, release_disc,
    release_track, song, song_credit,
};
use infra_db::SeaOrmRepository;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::Itertools;
use libfp::FunctorExt;
use sea_orm::prelude::*;
use sea_orm::{EntityTrait, QueryFilter, QueryOrder};

use crate::model::{
    ArtistCreditScope, ArtistSongCredit, ArtistSongCreditRelease, Credit, Disc,
};
use crate::releases::ArtistReleaseIR;

pub(crate) struct CreditIR {
    pub(crate) release: release::Model,
    pub(crate) artists: Vec<artist::Model>,
    pub(crate) cover_url: Option<String>,
    pub(crate) release_credits: Vec<release_credit::Model>,
}

pub(crate) struct SongCreditIR {
    pub(crate) song: song::Model,
    pub(crate) song_credits: Vec<song_credit::Model>,
    pub(crate) release_tracks: Vec<release_track::Model>,
    pub(crate) primary_release_id: Option<i32>,
}

pub(crate) struct SongCreditData {
    pub(crate) items: Vec<SongCreditIR>,
    pub(crate) releases: Vec<release::Model>,
    pub(crate) discs: Vec<release_disc::Model>,
}

pub(crate) async fn load_release_credit_details(
    repo: &SeaOrmRepository,
    artist_id: i32,
    scope: ArtistCreditScope,
    release_ids: &[i32],
) -> Result<
    (Vec<release_credit::Model>, Vec<release_artist::Model>),
    DatabaseError,
> {
    if matches!(scope, ArtistCreditScope::Song) {
        return Ok((Vec::new(), Vec::new()));
    }
    tokio::try_join!(
        release_credit::Entity::find()
            .filter(release_credit::Column::ArtistId.eq(artist_id))
            .filter(
                release_credit::Column::ReleaseId.is_in(release_ids.to_vec())
            )
            .all(&repo.conn),
        release_artist::Entity::find()
            .filter(release_artist::Column::ArtistId.eq(artist_id))
            .filter(
                release_artist::Column::ReleaseId.is_in(release_ids.to_vec())
            )
            .all(&repo.conn),
    )
    .db_operation("load artist credit release details")
}

pub(crate) fn release_credits_by_release(
    releases: &[ArtistReleaseIR],
    release_credits: &[release_credit::Model],
    release_artists: &[release_artist::Model],
    artist_id: i32,
    scope: ArtistCreditScope,
    role_id: Option<i32>,
) -> Vec<Vec<release_credit::Model>> {
    releases
        .iter()
        .map(|item| {
            let release_is_excluded = release_artists.iter().any(|artist| {
                artist.release_id == item.release.id
                    && artist.artist_id == artist_id
            });
            let release_matches = release_credits.iter().any(|credit| {
                credit.release_id == item.release.id
                    && role_id.is_none_or(|role_id| credit.role_id == role_id)
            });
            if matches!(scope, ArtistCreditScope::Song)
                || release_is_excluded
                || !release_matches
            {
                Vec::new()
            } else {
                release_credits
                    .iter()
                    .filter(|credit| credit.release_id == item.release.id)
                    .cloned()
                    .collect_vec()
            }
        })
        .collect_vec()
}

pub(crate) fn into_group_songs(
    data: SongCreditData,
    release_ids: &[i32],
    credit_roles: &[credit_role::Model],
) -> Vec<ArtistSongCredit> {
    let group_positions = release_ids
        .iter()
        .enumerate()
        .map(|(position, release_id)| (*release_id, position))
        .collect_vec();
    let mut items = data.items;
    items.sort_by(|left, right| {
        let left_position = left
            .primary_release_id
            .and_then(|id| group_positions.iter().find(|x| x.0 == id))
            .map_or(usize::MAX, |x| x.1);
        let right_position = right
            .primary_release_id
            .and_then(|id| group_positions.iter().find(|x| x.0 == id))
            .map_or(usize::MAX, |x| x.1);
        left_position
            .cmp(&right_position)
            .then_with(|| left.song.title.cmp(&right.song.title))
            .then_with(|| left.song.id.cmp(&right.song.id))
    });
    items
        .into_iter()
        .map(|item| {
            into_artist_song_credit(
                item,
                credit_roles,
                &data.releases,
                &data.discs,
            )
        })
        .collect_vec()
}

pub(crate) async fn load_song_credit_data(
    repo: &SeaOrmRepository,
    artist_id: i32,
    selected_songs: Vec<crate::credits::SelectedSong>,
) -> Result<SongCreditData, DatabaseError> {
    if selected_songs.is_empty() {
        return Ok(SongCreditData {
            items: Vec::new(),
            releases: Vec::new(),
            discs: Vec::new(),
        });
    }
    let song_ids = || selected_songs.iter().map(|song| song.id);
    let (songs, song_credits, release_tracks) = tokio::try_join!(
        song::Entity::find()
            .filter(song::Column::Id.is_in(song_ids()))
            .order_by_asc(song::Column::Title)
            .order_by_asc(song::Column::Id)
            .all(&repo.conn),
        song_credit::Entity::find()
            .filter(song_credit::Column::SongId.is_in(song_ids()))
            .filter(song_credit::Column::ArtistId.eq(artist_id))
            .all(&repo.conn),
        release_track::Entity::find()
            .filter(release_track::Column::SongId.is_in(song_ids()))
            .order_by_asc(release_track::Column::ReleaseId)
            .order_by_asc(release_track::Column::DiscId)
            .order_by_asc(release_track::Column::Id)
            .all(&repo.conn),
    )
    .db_operation("load artist song credit data")?;
    let release_ids = release_tracks
        .iter()
        .map(|track| track.release_id)
        .unique()
        .collect_vec();
    let (releases, discs) = if release_ids.is_empty() {
        (Vec::new(), Vec::new())
    } else {
        tokio::try_join!(
            release::Entity::find()
                .filter(release::Column::Id.is_in(release_ids.clone()))
                .all(&repo.conn),
            release_disc::Entity::find()
                .filter(release_disc::Column::ReleaseId.is_in(release_ids))
                .order_by_asc(release_disc::Column::ReleaseId)
                .order_by_asc(release_disc::Column::Id)
                .all(&repo.conn),
        )
        .db_operation("load artist song credit release context")?
    };

    let items = selected_songs
        .into_iter()
        .filter_map(|selected_song| {
            let song = songs
                .iter()
                .find(|song| song.id == selected_song.id)?
                .clone();
            let song_credits = song_credits
                .iter()
                .filter(|credit| credit.song_id == song.id)
                .cloned()
                .collect_vec();
            let release_tracks = release_tracks
                .iter()
                .filter(|track| track.song_id == song.id)
                .cloned()
                .collect_vec();
            Some(SongCreditIR {
                song,
                song_credits,
                release_tracks,
                primary_release_id: selected_song.primary_release_id,
            })
        })
        .collect_vec();
    Ok(SongCreditData {
        items,
        releases,
        discs,
    })
}

pub(crate) fn into_credit_roles(
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

pub(crate) fn into_artist_credits(
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
                Credit {
                    release_id: release.id,
                    title: release.title,
                    artist: artists.fmap_into(),
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

pub(crate) fn into_artist_song_credit(
    SongCreditIR {
        song,
        song_credits,
        release_tracks,
        primary_release_id,
    }: SongCreditIR,
    credit_roles: &[credit_role::Model],
    releases: &[release::Model],
    discs: &[release_disc::Model],
) -> ArtistSongCredit {
    let roles = song_credits
        .into_iter()
        .filter_map(|credit| {
            let role_id = credit.role_id?;
            let role = credit_roles
                .iter()
                .find(|role| role.id == role_id)
                .expect("Always has credit roles");
            Some(CreditRoleRef {
                id: role.id,
                name: role.name.clone(),
            })
        })
        .collect_vec();
    let releases = release_tracks
        .into_iter()
        .map(|track| {
            let release = releases
                .iter()
                .find(|release| release.id == track.release_id)
                .expect("Always has releases");

            let release_discs = discs
                .iter()
                .filter(|disc| disc.release_id == track.release_id)
                .collect_vec();

            let (disc_index, disc) = release_discs
                .iter()
                .enumerate()
                .find(|(_, disc)| disc.id == track.disc_id)
                .expect("Always has release discs");

            let disc = if release_discs.len() == 1 {
                None
            } else {
                Some(Disc {
                    index: u8::try_from(disc_index + 1)
                        .expect("Release disc position fits in u8"),
                    name: disc.name.clone(),
                })
            };

            ArtistSongCreditRelease {
                release_id: release.id,
                title: release.title.clone(),
                release_date: DateWithPrecision::from_option(
                    release.release_date,
                    release.release_date_precision,
                ),
                track_number: track.track_number,
                disc,
            }
        })
        .collect_vec();
    ArtistSongCredit {
        song_id: song.id,
        title: song.title,
        roles,
        primary_release_id,
        releases,
    }
}
