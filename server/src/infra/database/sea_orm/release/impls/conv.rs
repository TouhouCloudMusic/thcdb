use std::collections::HashMap;

use entity::enums::ReleaseImageType;
use entity::{
    language, release, release_artist, release_artist_history,
    release_catalog_number, release_catalog_number_history, release_credit,
    release_credit_history, release_track_artist,
};
use itertools::Itertools;
use libfp::EmptyExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr, EntityTrait,
    LoaderTrait, QueryFilter,
};

use super::RelatedEntities;
use crate::domain;
use crate::domain::release::model::{
    CatalogNumber, Release, ReleaseArtist, ReleaseCredit, ReleaseTrack,
};
use crate::domain::shared::model::{DateWithPrecision, NewLocalizedTitle};
use crate::domain::song::model::SongRef;
use crate::infra::database::sea_orm::cache::{
    LANGUAGE_CACHE, LanguageCache, LanguageCacheMap,
};
use crate::infra::database::sea_orm::ext::maybe_loader::MaybeLoader;

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
        catalog_nums: conv_catalog_numbers(&related.catalog_numbers[index]),
        localized_titles: conv_localized_titles(
            &related.localized_titles[index],
            related.languages,
        ),
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
        cover_art_url: related.cover_arts[index]
            .clone()
            .map(domain::image::Image::from)
            .map(|image| image.url()),
    }
}

// Map artists to domain model
fn conv_artists(artists: &[entity::artist::Model]) -> Vec<ReleaseArtist> {
    artists
        .iter()
        .map(|artist| ReleaseArtist {
            id: artist.id,
            name: artist.name.clone(),
        })
        .collect()
}

// Map catalog numbers to domain model
fn conv_catalog_numbers(
    catalog_nums: &[entity::release_catalog_number::Model],
) -> Vec<CatalogNumber> {
    catalog_nums
        .iter()
        .map(|cn| CatalogNumber {
            catalog_number: cn.catalog_number.clone(),
            label_id: cn.label_id,
        })
        .collect()
}

// Map localized titles to domain model
fn conv_localized_titles(
    loc_titles: &[entity::release_localized_title::Model],
    languages: &LanguageCacheMap,
) -> Vec<crate::domain::shared::model::LocalizedTitle> {
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

            crate::domain::shared::model::LocalizedTitle {
                language,
                title: lt.title.clone(),
            }
        })
        .collect()
}

// Map credits to domain model
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
                role: crate::domain::credit_role::model::CreditRoleRef {
                    id: role.id,
                    name: role.name.clone(),
                },
                on: credit.on.clone(),
            }
        })
        .collect()
}

// Map tracks to domain model
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

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use entity::{
        artist, credit_role, release_catalog_number, release_credit,
        release_localized_title, release_track, song,
    };
    use itertools::Itertools;

    use super::{
        conv_artists, conv_catalog_numbers, conv_credits,
        conv_localized_titles, conv_tracks,
    };
    use crate::domain;
    use crate::domain::release::model::{
        CatalogNumber, ReleaseArtist, ReleaseCredit, ReleaseTrack,
    };
    use crate::domain::shared::model::Language;
    use crate::domain::song::model::SongRef;

    #[test]
    fn test_conv_artists() {
        let artists = vec![
            artist::Model {
                id: 1,
                name: "Artist 1".to_string(),
                artist_type: entity::sea_orm_active_enums::ArtistType::Solo,
                text_alias: None,
                start_date: None,
                start_date_precision: None,
                end_date: None,
                end_date_precision: None,
                current_location_country: None,
                current_location_province: None,
                current_location_city: None,
                start_location_country: None,
                start_location_province: None,
                start_location_city: None,
            },
            artist::Model {
                id: 2,
                name: "Artist 2".to_string(),
                artist_type: entity::sea_orm_active_enums::ArtistType::Solo,
                text_alias: None,
                start_date: None,
                start_date_precision: None,
                end_date: None,
                end_date_precision: None,
                current_location_country: None,
                current_location_province: None,
                current_location_city: None,
                start_location_country: None,
                start_location_province: None,
                start_location_city: None,
            },
        ];

        let expected = vec![
            ReleaseArtist {
                id: 1,
                name: "Artist 1".to_string(),
            },
            ReleaseArtist {
                id: 2,
                name: "Artist 2".to_string(),
            },
        ];

        let result = conv_artists(&artists);

        assert_eq!(result, expected);
    }
    #[test]
    fn test_conv_catalog_numbers() {
        let catalog_numbers = vec![
            release_catalog_number::Model {
                id: 1,
                release_id: 1,
                catalog_number: "CAT-1".to_string(),
                label_id: Some(1),
            },
            release_catalog_number::Model {
                id: 2,
                release_id: 1,
                catalog_number: "CAT-2".to_string(),
                label_id: None,
            },
        ];

        let expected = vec![
            CatalogNumber {
                catalog_number: "CAT-1".to_string(),
                label_id: Some(1),
            },
            CatalogNumber {
                catalog_number: "CAT-2".to_string(),
                label_id: None,
            },
        ];

        let result = conv_catalog_numbers(&catalog_numbers);

        assert_eq!(result, expected);
    }
    #[test]
    fn test_conv_localized_titles() {
        let loc_titles = vec![
            release_localized_title::Model {
                release_id: 1,
                language_id: 1,
                title: "Title EN".to_string(),
            },
            release_localized_title::Model {
                release_id: 1,
                language_id: 2,
                title: "Title JP".to_string(),
            },
        ];

        let lang_en = Language {
            id: 1,
            code: "en".to_string(),
            name: "English".to_string(),
        };
        let lang_jp = Language {
            id: 2,
            code: "jp".to_string(),
            name: "Japanese".to_string(),
        };
        let languages: HashMap<i32, Language> =
            [(1, lang_en.clone()), (2, lang_jp.clone())]
                .iter()
                .cloned()
                .collect();

        let expected = vec![
            domain::shared::model::LocalizedTitle {
                language: lang_en,
                title: "Title EN".to_string(),
            },
            domain::shared::model::LocalizedTitle {
                language: lang_jp,
                title: "Title JP".to_string(),
            },
        ];

        let result = conv_localized_titles(&loc_titles, &languages);

        assert_eq!(result, expected);
    }
    #[test]
    fn test_conv_credits() {
        let credits = vec![
            release_credit::Model {
                id: 1,
                release_id: 1,
                artist_id: 1,
                role_id: 1,
                on: Some(vec![1]),
            },
            release_credit::Model {
                id: 2,
                release_id: 1,
                artist_id: 2,
                role_id: 2,
                on: None,
            },
        ];

        let credit_artists = vec![
            artist::Model {
                id: 1,
                name: "Artist 1".to_string(),
                artist_type: entity::sea_orm_active_enums::ArtistType::Solo,
                text_alias: None,
                start_date: None,
                start_date_precision: None,
                end_date: None,
                end_date_precision: None,
                current_location_country: None,
                current_location_province: None,
                current_location_city: None,
                start_location_country: None,
                start_location_province: None,
                start_location_city: None,
            },
            artist::Model {
                id: 2,
                name: "Artist 2".to_string(),
                artist_type: entity::sea_orm_active_enums::ArtistType::Solo,
                text_alias: None,
                start_date: None,
                start_date_precision: None,
                end_date: None,
                end_date_precision: None,
                current_location_country: None,
                current_location_province: None,
                current_location_city: None,
                start_location_country: None,
                start_location_province: None,
                start_location_city: None,
            },
        ];

        let credit_roles = vec![
            credit_role::Model {
                id: 1,
                name: "Role 1".to_string(),
                short_description: String::new(),
                description: "".to_string(),
            },
            credit_role::Model {
                id: 2,
                name: "Role 2".to_string(),
                short_description: "".to_string(),
                description: "".to_string(),
            },
        ];

        let expected = vec![
            ReleaseCredit {
                artist: ReleaseArtist {
                    id: 1,
                    name: "Artist 1".to_string(),
                },
                role: crate::domain::credit_role::model::CreditRoleRef {
                    id: 1,
                    name: "Role 1".to_string(),
                },
                on: Some(vec![1]),
            },
            ReleaseCredit {
                artist: ReleaseArtist {
                    id: 2,
                    name: "Artist 2".to_string(),
                },
                role: crate::domain::credit_role::model::CreditRoleRef {
                    id: 2,
                    name: "Role 2".to_string(),
                },
                on: None,
            },
        ];

        let result = conv_credits(&credits, &credit_artists, &credit_roles);

        assert_eq!(result, expected);
    }
    #[test]
    fn test_conv_tracks() {
        let tracks = vec![
            release_track::Model {
                id: 1,
                release_id: 1,
                song_id: 1,
                track_number: Some("1".to_string()),
                display_title: Some("Track 1".to_string()),
                duration: Some(180),
            },
            release_track::Model {
                id: 2,
                release_id: 1,
                song_id: 2,
                track_number: Some("2".to_string()),
                display_title: Some("Track 2".to_string()),
                duration: None,
            },
        ];

        let songs = vec![
            song::Model {
                id: 1,
                title: "Song 1".to_string(),
            },
            song::Model {
                id: 2,
                title: "Song 2".to_string(),
            },
        ];

        let all_track_artists = vec![
            artist::Model {
                id: 1,
                name: "Artist 1".to_string(),
                artist_type: entity::sea_orm_active_enums::ArtistType::Solo,
                text_alias: None,
                start_date: None,
                start_date_precision: None,
                end_date: None,
                end_date_precision: None,
                current_location_country: None,
                current_location_province: None,
                current_location_city: None,
                start_location_country: None,
                start_location_province: None,
                start_location_city: None,
            },
            artist::Model {
                id: 2,
                name: "Artist 2".to_string(),
                artist_type: entity::sea_orm_active_enums::ArtistType::Solo,
                text_alias: None,
                start_date: None,
                start_date_precision: None,
                end_date: None,
                end_date_precision: None,
                current_location_country: None,
                current_location_province: None,
                current_location_city: None,
                start_location_country: None,
                start_location_province: None,
                start_location_city: None,
            },
        ];

        let track_artist_ids_mapping = vec![vec![1], vec![1, 2]];

        let expected = vec![
            ReleaseTrack {
                id: 1,
                track_number: Some("1".to_string()),
                display_title: Some("Track 1".to_string()),
                duration: Some(180),
                song: SongRef {
                    id: 1,
                    title: "Song 1".to_string(),
                },
                artists: vec![ReleaseArtist {
                    id: 1,
                    name: "Artist 1".to_string(),
                }],
            },
            ReleaseTrack {
                id: 2,
                track_number: Some("2".to_string()),
                display_title: Some("Track 2".to_string()),
                duration: None,
                song: SongRef {
                    id: 2,
                    title: "Song 2".to_string(),
                },
                artists: vec![
                    ReleaseArtist {
                        id: 1,
                        name: "Artist 1".to_string(),
                    },
                    ReleaseArtist {
                        id: 2,
                        name: "Artist 2".to_string(),
                    },
                ],
            },
        ];

        let result = conv_tracks(
            &tracks,
            &songs,
            &all_track_artists,
            &track_artist_ids_mapping,
        );

        assert_eq!(result, expected);
    }
}
