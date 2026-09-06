use std::collections::HashMap;

use domain::shared::{Language, LocalizedTitle, SimpleLabel};
use entity::sea_orm_active_enums::DatePrecision;
use entity::{
    artist, credit_role, label as label_entity, release_catalog_number,
    release_credit, release_localized_title,
};

use super::{
    conv_artists, conv_catalog_numbers, conv_credits, conv_localized_titles,
};
use crate::features::release::model::{
    CatalogNumber, ReleaseArtist, ReleaseCredit,
};

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
        LocalizedTitle {
            language: lang_en,
            title: "Title EN".to_string(),
        },
        LocalizedTitle {
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
            role: crate::features::credit_role::CreditRoleRef {
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
            role: crate::features::credit_role::CreditRoleRef {
                id: 2,
                name: "Role 2".to_string(),
            },
            on: None,
        },
    ];

    let result = conv_credits(&credits, &credit_artists, &credit_roles);

    assert_eq!(result, expected);
}
