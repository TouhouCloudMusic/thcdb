use crate::sea_orm_active_enums::ArtistType;

impl ArtistType {
    pub fn is_solo(&self) -> bool {
        matches!(self, ArtistType::Solo)
    }

    pub fn is_multiple(&self) -> bool {
        matches!(self, ArtistType::Multiple)
    }

    pub fn is_unknown(&self) -> bool {
        matches!(self, ArtistType::Unknown)
    }
}
