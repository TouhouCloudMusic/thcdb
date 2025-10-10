use entity::release;
use itertools::Itertools;

use super::RelatedEntities;
use crate::domain;
use crate::domain::credit_role::CreditRoleRef;
use crate::domain::event::SimpleEvent;
use crate::domain::label::SimpleLabel;
use crate::domain::release::{
    CatalogNumber, Release, ReleaseArtist, ReleaseCredit, ReleaseDisc,
    ReleaseTrack,
};
use crate::domain::shared::DateWithPrecision;
use crate::domain::song::SongRef;
use crate::infra::database::sea_orm::cache::LanguageCacheMap;

#[cfg(test)]
mod tests;

pub(super) fn conv_to_domain_model(
    release_model: &release::Model,
    related: &RelatedEntities,
    index: usize,
) -> Release {
    Release {
        id: release_model.id,
        title: release_model.title.clone(),
        release_type: release_model.release_type,
        release_date: DateWithPrecision::from_option(
            release_model.release_date,
            release_model.release_date_precision,
        ),
        recording_date_start: DateWithPrecision::from_option(
            release_model.recording_date_start,
            release_model.recording_date_start_precision,
        ),
        recording_date_end: DateWithPrecision::from_option(
            release_model.recording_date_end,
            release_model.recording_date_end_precision,
        ),
        artists: conv_artists(&related.artists[index]),
        catalog_nums: conv_catalog_numbers(
            &related.catalog_numbers[index],
            &related.labels,
        ),
        localized_titles: conv_localized_titles(
            &related.localized_titles[index],
            related.languages,
        ),
        discs: conv_discs(&related.discs[index]),
        tracks: conv_tracks(
            &related.tracks[index],
            &related.track_songs,
            &related.track_artists,
            &related.track_artist_ids[index],
        ),
        credits: conv_credits(
            &related.credits[index],
            &related.credit_artists,
            &related.credit_roles,
        ),
        events: conv_events(&related.events[index]),
        cover_art_url: related.cover_arts[index]
            .clone()
            .map(domain::image::Image::from)
            .map(|image| image.url()),
    }
}

fn conv_artists(artists: &[entity::artist::Model]) -> Vec<ReleaseArtist> {
    artists
        .iter()
        .map(|artist| ReleaseArtist {
            id: artist.id,
            name: artist.name.clone(),
        })
        .collect()
}

fn conv_catalog_numbers(
    catalog_nums: &[entity::release_catalog_number::Model],
    labels: &[entity::label::Model],
) -> Vec<CatalogNumber> {
    catalog_nums
        .iter()
        .map(|cn| {
            let label = cn
                .label_id
                .and_then(|id| labels.iter().find(|l| l.id == id))
                .map(|l| SimpleLabel {
                    id: l.id,
                    name: l.name.clone(),
                });

            CatalogNumber {
                catalog_number: cn.catalog_number.clone(),
                label,
            }
        })
        .collect()
}

fn conv_localized_titles(
    loc_titles: &[entity::release_localized_title::Model],
    languages: &LanguageCacheMap,
) -> Vec<crate::domain::shared::LocalizedTitle> {
    loc_titles
        .iter()
        .map(|lt| {
            let language = languages
                .iter()
                .find(|l| *l.0 == lt.language_id)
                .unwrap_or_else(|| {
                    panic!("Language with id {} not found", lt.language_id)
                })
                .1
                .clone();

            crate::domain::shared::LocalizedTitle {
                language,
                title: lt.title.clone(),
            }
        })
        .collect()
}

fn conv_credits(
    credits: &[entity::release_credit::Model],
    credit_artists: &[entity::artist::Model],
    credit_roles: &[entity::credit_role::Model],
) -> Vec<ReleaseCredit> {
    credits
        .iter()
        .map(|credit| {
            let artist = credit_artists
                .iter()
                .find(|a| a.id == credit.artist_id)
                .unwrap_or_else(|| {
                    panic!("Artist with id {} not found", credit.artist_id)
                });

            let role = credit_roles
                .iter()
                .find(|r| r.id == credit.role_id)
                .unwrap_or_else(|| {
                    panic!("Role with id {} not found", credit.role_id)
                });

            ReleaseCredit {
                artist: ReleaseArtist {
                    id: artist.id,
                    name: artist.name.clone(),
                },
                role: CreditRoleRef {
                    id: role.id,
                    name: role.name.clone(),
                },
                on: credit.on.clone(),
            }
        })
        .collect()
}

fn conv_tracks(
    tracks: &[entity::release_track::Model],
    songs: &[entity::song::Model],
    all_track_artists: &[entity::artist::Model],
    track_artist_ids_mapping: &[Vec<i32>],
) -> Vec<ReleaseTrack> {
    tracks
        .iter()
        .zip(track_artist_ids_mapping)
        .map(|(track, artist_ids)| {
            let song = songs
                .iter()
                .find(|s| s.id == track.song_id)
                .expect("Song should exist for track");

            let artists = artist_ids
                .iter()
                .map(|&artist_id| {
                    all_track_artists
                        .iter()
                        .find(|artist| artist.id == artist_id)
                        .map(|artist| ReleaseArtist {
                            id: artist.id,
                            name: artist.name.clone(),
                        })
                        .expect("Artist should exist for track")
                })
                .collect_vec();

            ReleaseTrack {
                id: track.id,
                track_number: track.track_number.clone(),
                disc_id: track.disc_id,
                display_title: track.display_title.clone(),
                duration: track.duration,
                song: SongRef {
                    id: song.id,
                    title: song.title.clone(),
                },
                artists,
            }
        })
        .collect()
}

fn conv_discs(discs: &[entity::release_disc::Model]) -> Vec<ReleaseDisc> {
    discs
        .iter()
        .map(|disc| ReleaseDisc {
            id: disc.id,
            name: disc.name.clone(),
        })
        .collect()
}

fn conv_events(events: &[entity::event::Model]) -> Vec<SimpleEvent> {
    events
        .iter()
        .map(|e| SimpleEvent {
            id: e.id,
            name: e.name.clone(),
        })
        .collect()
}
