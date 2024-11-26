pub mod input {
    use chrono::Duration;
    use entity::{release_localized_title, release_localized_title_history};

    pub struct LocalizedTitle {
        pub title: String,
        pub language_id: i32,
    }

    impl From<LocalizedTitle> for release_localized_title::Model {
        #[inline]
        fn from(val: LocalizedTitle) -> Self {
            release_localized_title::Model {
                release_id: Default::default(),
                language_id: val.language_id,
                title: val.title,
            }
        }
    }

    impl From<LocalizedTitle> for release_localized_title_history::Model {
        #[inline]
        fn from(val: LocalizedTitle) -> Self {
            release_localized_title_history::Model {
                history_id: Default::default(),
                language_id: val.language_id,
                title: val.title,
            }
        }
    }

    impl From<&LocalizedTitle> for release_localized_title::Model {
        #[inline]
        fn from(val: &LocalizedTitle) -> Self {
            release_localized_title::Model {
                release_id: Default::default(),
                language_id: val.language_id,
                title: val.title.clone(),
            }
        }
    }

    impl From<&LocalizedTitle> for release_localized_title_history::Model {
        #[inline]
        fn from(val: &LocalizedTitle) -> Self {
            release_localized_title_history::Model {
                history_id: Default::default(),
                language_id: val.language_id,
                title: val.title.clone(),
            }
        }
    }

    macro_rules! define_track {
        ($name:ident { $($vis:vis $field:ident: $ftype:ty),* $(,)? }) => {
            pub struct $name {
                pub artist: Vec<i32>,
                pub track_number: String,
                pub track_order: i16,
                pub duration: Option<Duration>,
                $($vis $field: $ftype,)*
            }
        };
    }

    define_track!(UnlinkedTrack {
        pub title: String,
    });

    define_track!(LinkedTrack {
        pub title: Option<String>,
        pub song_id: i32,
    });

    pub enum Track {
        Unlinked(UnlinkedTrack),
        Linked(LinkedTrack),
    }

    pub struct Credit {
        pub artist_id: i32,
        pub role_id: i32,
        pub on: Option<Vec<i16>>,
    }
}
