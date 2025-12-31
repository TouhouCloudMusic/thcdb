use super::state::SeaOrmTxRepo;
use crate::domain::correction::ApproveCorrectionContext;

impl ApproveCorrectionContext for SeaOrmTxRepo {
    type ArtistRepo = Self;
    type ReleaseRepo = Self;
    type SongRepo = Self;
    type LabelRepo = Self;
    type EventRepo = Self;
    type TagRepo = Self;
    type SongLyricsRepo = Self;
    type CreditRoleRepo = Self;

    fn artist_repo(self) -> Self::ArtistRepo {
        self
    }

    fn release_repo(self) -> Self::ReleaseRepo {
        self
    }

    fn song_repo(self) -> Self::SongRepo {
        self
    }

    fn label_repo(self) -> Self::LabelRepo {
        self
    }

    fn event_repo(self) -> Self::EventRepo {
        self
    }

    fn tag_repo(self) -> Self::TagRepo {
        self
    }

    fn song_lyrics_repo(self) -> Self::SongLyricsRepo {
        self
    }

    fn credit_role_repo(self) -> Self::CreditRoleRepo {
        self
    }
}
