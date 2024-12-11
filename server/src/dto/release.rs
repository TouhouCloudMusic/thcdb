pub mod input {
    use chrono::Duration;
    use entity::{
        release_localized_title, release_localized_title_history, song,
    };
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::IntoActiveModel;

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

    impl IntoActiveModel<song::ActiveModel> for UnlinkedTrack {
        fn into_active_model(self) -> song::ActiveModel {
            song::ActiveModel {
                id: NotSet,
                title: Set(self.title),
                duration: Set(self.duration.map(|d| d.to_string())),
                created_at: NotSet,
                updated_at: NotSet,
            }
        }
    }

    impl IntoActiveModel<song::ActiveModel> for &UnlinkedTrack {
        fn into_active_model(self) -> song::ActiveModel {
            song::ActiveModel {
                id: NotSet,
                title: Set(self.title.clone()),
                duration: Set(self.duration.map(|d| d.to_string())),
                created_at: NotSet,
                updated_at: NotSet,
            }
        }
    }

    impl From<(song::Model, UnlinkedTrack)> for LinkedTrack {
        fn from((model, track): (song::Model, UnlinkedTrack)) -> Self {
            Self {
                title: model.title.into(),
                song_id: model.id,
                artist: track.artist,
                track_number: track.track_number,
                track_order: track.track_order,
                duration: track.duration,
            }
        }
    }

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
