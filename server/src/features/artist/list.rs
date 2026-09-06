use std::collections::HashMap;

use domain::image::Image;
use domain::shared::Location;
use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::{ArtistImageType, ArtistType};
use entity::{artist, artist_image, image};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait, JoinType,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait, Select,
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct ArtistListItem {
    pub id: i32,
    pub name: String,
    pub artist_type: ArtistType,
    pub profile_image_url: Option<String>,
    pub current_location: Location,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "artist::Entity", from_query_result)]
pub(crate) struct ArtistRow {
    id: i32,
    name: String,
    artist_type: ArtistType,
    current_location_country: Option<String>,
    current_location_province: Option<String>,
    current_location_city: Option<String>,
}

pub(crate) async fn load(
    select: Select<artist::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<ArtistListItem>, DatabaseError> {
    let artists = select
        .into_partial_model::<ArtistRow>()
        .all(db)
        .await
        .db_operation("load artist list items")?;

    load_items(artists, db).await
}

/// Loads list associations and returns one item per row in the same order.
pub(crate) async fn load_items(
    artists: Vec<ArtistRow>,
    db: &impl ConnectionTrait,
) -> Result<Vec<ArtistListItem>, DatabaseError> {
    if artists.is_empty() {
        return Ok(Vec::new());
    }

    let profile_images = artist_image::Entity::find()
        .select_only()
        .column(artist_image::Column::ArtistId)
        .column(image::Column::Directory)
        .column(image::Column::Filename)
        .column(image::Column::Backend)
        .join(JoinType::InnerJoin, artist_image::Relation::Image.def())
        .filter(
            artist_image::Column::ArtistId
                .is_in(artists.iter().map(|artist| artist.id)),
        )
        .filter(artist_image::Column::Type.eq(ArtistImageType::Profile))
        .order_by_desc(image::Column::UploadedAt)
        .into_tuple::<(i32, String, String, StorageBackend)>()
        .all(db)
        .await
        .db_operation("load artist list profile images")?;

    let mut profile_image_urls = HashMap::new();
    for (artist_id, directory, filename, backend) in profile_images {
        profile_image_urls.entry(artist_id).or_insert_with(|| {
            Image::format_url(backend, &directory, &filename)
        });
    }

    Ok(artists
        .into_iter()
        .map(|artist| ArtistListItem {
            id: artist.id,
            name: artist.name,
            artist_type: artist.artist_type,
            profile_image_url: profile_image_urls.remove(&artist.id),
            current_location: Location {
                country: artist.current_location_country,
                province: artist.current_location_province,
                city: artist.current_location_city,
            },
        })
        .collect())
}
