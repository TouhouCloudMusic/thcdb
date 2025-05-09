use crate::sea_orm_active_enums::ArtistType;

impl ArtistType {
    pub const fn is_solo(&self) -> bool {
        matches!(self, ArtistType::Solo)
    }

    pub const fn is_multiple(&self) -> bool {
        matches!(self, ArtistType::Multiple)
    }

    pub const fn is_unknown(&self) -> bool {
        matches!(self, ArtistType::Unknown)
    }
}
