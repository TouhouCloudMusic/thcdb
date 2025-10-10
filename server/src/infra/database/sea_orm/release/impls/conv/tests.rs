use std::collections::HashMap;

use entity::sea_orm_active_enums::DatePrecision;
use entity::{
    artist, credit_role, label as label_entity, release_catalog_number,
    release_credit, release_localized_title, release_track, song,
};

use super::{
    conv_artists, conv_catalog_numbers, conv_credits, conv_localized_titles,
    conv_tracks,
};
use crate::domain;
use crate::domain::label::SimpleLabel;
use crate::domain::release::{
    CatalogNumber, ReleaseArtist, ReleaseCredit, ReleaseTrack,
};
use crate::domain::shared::Language;
use crate::domain::song::SongRef;

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

    let labels = vec![label_entity::Model {
        id: 1,
        name: "Label 1".to_string(),
        founded_date: None,
        founded_date_precision: DatePrecision::Year,
        dissolved_date: None,
        dissolved_date_precision: DatePrecision::Year,
    }];

    let expected = vec![
        CatalogNumber {
            catalog_number: "CAT-1".to_string(),
            label: Some(SimpleLabel {
                id: 1,
                name: "Label 1".into(),
            }),
        },
        CatalogNumber {
            catalog_number: "CAT-2".to_string(),
            label: None,
        },
    ];

    let result = conv_catalog_numbers(&catalog_numbers, &labels);

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
        domain::shared::LocalizedTitle {
            language: lang_en,
            title: "Title EN".to_string(),
        },
        domain::shared::LocalizedTitle {
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
            description: String::new(),
        },
        credit_role::Model {
            id: 2,
            name: "Role 2".to_string(),
            short_description: String::new(),
            description: String::new(),
        },
    ];

    let expected = vec![
        ReleaseCredit {
            artist: ReleaseArtist {
                id: 1,
                name: "Artist 1".to_string(),
            },
            role: crate::domain::credit_role::CreditRoleRef {
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
            role: crate::domain::credit_role::CreditRoleRef {
                id: 2,
                name: "Role 2".to_string(),
            },
            on: None,
        },
    ];

    let result = conv_credits(&credits, &credit_artists, &credit_roles);

    assert_eq!(result, expected);
}

#[expect(clippy::too_many_lines)]
#[test]
fn test_conv_tracks() {
    let tracks = vec![
        release_track::Model {
            id: 1,
            release_id: 1,
            song_id: 1,
            disc_id: 1,
            track_number: Some("1".to_string()),
            display_title: Some("Track 1".to_string()),
            duration: Some(180),
        },
        release_track::Model {
            id: 2,
            release_id: 1,
            song_id: 2,
            disc_id: 1,
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
            disc_id: 1,
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
            disc_id: 1,
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
