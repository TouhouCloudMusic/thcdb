use std::collections::HashMap;

use domain::shared::{Language, LocalizedTitle, SimpleLabel};
use entity::sea_orm_active_enums::{ArtistType, DatePrecision};
use entity::{
    artist, credit_role, label as label_entity, release_catalog_number,
    release_credit, release_localized_title,
};

use super::{conv_catalog_numbers, conv_credits, conv_localized_titles};
use crate::features::release::model::{
    CatalogNumber, ReleaseArtist, ReleaseCredit,
};

#[test]
fn catalog_numbers_use_label_ids_instead_of_input_order() {
    let catalog_numbers = vec![
        release_catalog_number::Model {
            id: 101,
            release_id: 1,
            catalog_number: "CAT-1".to_string(),
            label_id: Some(1),
        },
        release_catalog_number::Model {
            id: 102,
            release_id: 1,
            catalog_number: "CAT-2".to_string(),
            label_id: Some(2),
        },
    ];
    let labels = vec![
        label_entity::Model {
            id: 2,
            name: "Label 2".to_string(),
            founded_date: None,
            founded_date_precision: DatePrecision::Year,
            dissolved_date: None,
            dissolved_date_precision: DatePrecision::Year,
        },
        label_entity::Model {
            id: 1,
            name: "Label 1".to_string(),
            founded_date: None,
            founded_date_precision: DatePrecision::Year,
            dissolved_date: None,
            dissolved_date_precision: DatePrecision::Year,
        },
    ];

    assert_eq!(
        conv_catalog_numbers(&catalog_numbers, &labels),
        vec![
            CatalogNumber {
                catalog_number: "CAT-1".to_string(),
                label: Some(SimpleLabel {
                    id: 1,
                    name: "Label 1".into(),
                }),
            },
            CatalogNumber {
                catalog_number: "CAT-2".to_string(),
                label: Some(SimpleLabel {
                    id: 2,
                    name: "Label 2".into(),
                }),
            },
        ]
    );
}

#[test]
fn localized_titles_use_language_ids() {
    let localized_titles = vec![
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
    let languages = HashMap::from([
        (
            1,
            Language {
                id: 1,
                code: "en".to_string(),
                name: "English".to_string(),
            },
        ),
        (
            2,
            Language {
                id: 2,
                code: "jp".to_string(),
                name: "Japanese".to_string(),
            },
        ),
    ]);

    assert_eq!(
        conv_localized_titles(&localized_titles, &languages),
        vec![
            LocalizedTitle {
                language: languages[&1].clone(),
                title: "Title EN".to_string(),
            },
            LocalizedTitle {
                language: languages[&2].clone(),
                title: "Title JP".to_string(),
            },
        ]
    );
}

#[test]
fn credits_match_artists_and_roles_by_id_and_preserve_track_scope() {
    let credits = vec![
        release_credit::Model {
            id: 1,
            release_id: 1,
            artist_id: 1,
            role_id: 10,
            on: Some(vec![1]),
        },
        release_credit::Model {
            id: 2,
            release_id: 1,
            artist_id: 2,
            role_id: 20,
            on: Some(vec![]),
        },
    ];
    let artist_one = artist::Model {
        id: 1,
        name: "Artist 1".to_string(),
        artist_type: ArtistType::Solo,
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
    };
    let credit_artists = vec![
        artist::Model {
            id: 2,
            name: "Artist 2".to_string(),
            ..artist_one.clone()
        },
        artist_one,
    ];
    let credit_roles = vec![
        credit_role::Model {
            id: 20,
            name: "Role 2".to_string(),
            short_description: String::new(),
            description: String::new(),
        },
        credit_role::Model {
            id: 10,
            name: "Role 1".to_string(),
            short_description: String::new(),
            description: String::new(),
        },
    ];

    assert_eq!(
        conv_credits(&credits, &credit_artists, &credit_roles),
        vec![
            ReleaseCredit {
                artist: ReleaseArtist {
                    id: 1,
                    name: "Artist 1".to_string(),
                },
                role: domain::credit_role::CreditRoleRef {
                    id: 10,
                    name: "Role 1".to_string(),
                },
                on: Some(vec![1]).into(),
            },
            ReleaseCredit {
                artist: ReleaseArtist {
                    id: 2,
                    name: "Artist 2".to_string(),
                },
                role: domain::credit_role::CreditRoleRef {
                    id: 20,
                    name: "Role 2".to_string(),
                },
                on: None.into(),
            },
        ]
    );
}
