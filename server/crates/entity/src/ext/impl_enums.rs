use crate::sea_orm_active_enums::ArtistType;

impl ArtistType {
    #[must_use]
    pub const fn is_solo(&self) -> bool {
        matches!(self, ArtistType::Solo)
    }

    #[must_use]
    pub const fn is_multiple(&self) -> bool {
        matches!(self, ArtistType::Multiple)
    }

    #[must_use]
    pub const fn is_unknown(&self) -> bool {
        matches!(self, ArtistType::Unknown)
    }
}
