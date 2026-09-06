use std::collections::HashMap;

use domain::image::Image;
use domain::shared::{
    DateWithPrecision, LocalizedTitle, SimpleEvent, SimpleLabel,
};
use entity::release;

use super::RelatedEntities;
use crate::features::credit_role::CreditRoleRef;
use crate::features::release::model::{
    CatalogNumber, Release, ReleaseArtist, ReleaseCredit, ReleaseDisc,
    ReleaseTrack,
};
use crate::features::song::model::SongRef;
use crate::infra::database::cache::LanguageCacheMap;

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
        links: related.links[index]
            .iter()
            .map(|link| link.url.clone())
            .collect(),
        discs: conv_discs(&related.discs[index]),
        tracks: conv_tracks(
            &related.tracks[index],
            &related.track_songs,
            &related.track_artists,
        ),
        credits: conv_credits(
            &related.credits[index],
            &related.credit_artists,
            &related.credit_roles,
        ),
        events: conv_events(&related.events[index]),
        cover_art_url: related.cover_arts[index]
            .clone()
            .map(Image::from)
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
) -> Vec<LocalizedTitle> {
    loc_titles
        .iter()
        .map(|lt| {
            let language = languages
                .get(&lt.language_id)
                .unwrap_or_else(|| {
                    panic!("Language with id {} not found", lt.language_id)
                })
                .clone();

            LocalizedTitle {
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
    track_artists: &HashMap<i32, Vec<ReleaseArtist>>,
) -> Vec<ReleaseTrack> {
    tracks
        .iter()
        .map(|track| {
            let song = songs
                .iter()
                .find(|s| s.id == track.song_id)
                .expect("Song should exist for track");

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
                artists: track_artists[&track.id].clone(),
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
