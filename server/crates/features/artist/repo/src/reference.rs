use domain::shared::SimpleArtist;
use sea_orm::DerivePartialModel;

#[derive(DerivePartialModel)]
#[sea_orm(entity = "entity::artist::Entity", from_query_result)]
pub struct ArtistReferenceRow {
    pub id: i32,
    pub name: String,
}

impl From<ArtistReferenceRow> for SimpleArtist {
    fn from(artist: ArtistReferenceRow) -> Self {
        Self {
            id: artist.id,
            name: artist.name,
        }
    }
}
