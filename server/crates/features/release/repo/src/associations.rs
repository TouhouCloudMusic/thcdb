use std::collections::HashMap;

use domain::shared::SimpleArtist;
use entity::sea_orm_active_enums::ReleaseImageType;
use entity::{artist, image, release_artist, release_image};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, JoinType, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait,
};

/// Loads each release's artists in a stable order.
pub async fn load_artists(
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, Vec<SimpleArtist>>, DatabaseError> {
    if release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let artist_rows = release_artist::Entity::find()
        .select_only()
        .column(release_artist::Column::ReleaseId)
        .column(artist::Column::Id)
        .column(artist::Column::Name)
        .join(JoinType::InnerJoin, release_artist::Relation::Artist.def())
        .filter(
            release_artist::Column::ReleaseId
                .is_in(release_ids.iter().copied()),
        )
        .order_by_asc(release_artist::Column::ArtistId)
        .into_tuple::<(i32, i32, String)>()
        .all(db)
        .await
        .db_context("load release list artists")?;

    let mut artists: HashMap<i32, Vec<SimpleArtist>> = HashMap::new();
    for (release_id, id, name) in artist_rows {
        artists
            .entry(release_id)
            .or_default()
            .push(SimpleArtist { id, name });
    }

    Ok(artists)
}

/// Loads the latest cover's object key for each release.
/// Releases without covers are omitted.
pub async fn load_cover_art_urls(
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, String>, DatabaseError> {
    if release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let image_rows = release_image::Entity::find()
        .select_only()
        .column(release_image::Column::ReleaseId)
        .column(image::Column::ObjectKey)
        .join(JoinType::InnerJoin, release_image::Relation::Image.def())
        .filter(
            release_image::Column::ReleaseId.is_in(release_ids.iter().copied()),
        )
        .filter(release_image::Column::Type.eq(ReleaseImageType::Cover))
        .order_by_desc(image::Column::UploadedAt)
        .order_by_desc(image::Column::Id)
        .into_tuple::<(i32, String)>()
        .all(db)
        .await
        .db_context("load release list cover art")?;

    let mut cover_art_urls = HashMap::new();
    for (release_id, object_key) in image_rows {
        cover_art_urls.entry(release_id).or_insert(object_key);
    }

    Ok(cover_art_urls)
}
