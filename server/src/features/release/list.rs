use std::collections::HashMap;

use domain::image::Image;
use domain::shared::{DateWithPrecision, SimpleArtist};
use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::{
    DatePrecision, ReleaseImageType, ReleaseType,
};
use entity::{
    artist, image, release, release_artist, release_catalog_number,
    release_image,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait, JoinType,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait, Select,
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct ReleaseListItem {
    pub id: i32,
    pub title: String,
    pub cover_art_url: Option<String>,
    pub artists: Vec<SimpleArtist>,
    pub release_type: ReleaseType,
    pub release_date: Option<DateWithPrecision>,
    pub catalog_numbers: Vec<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct ReleaseRef {
    pub id: i32,
    pub title: String,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "release::Entity", from_query_result)]
pub(crate) struct ReleaseRow {
    id: i32,
    title: String,
    release_type: ReleaseType,
    release_date: Option<chrono::NaiveDate>,
    release_date_precision: DatePrecision,
}

pub(crate) async fn load(
    select: Select<release::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<ReleaseListItem>, DatabaseError> {
    let releases = select
        .into_partial_model::<ReleaseRow>()
        .all(db)
        .await
        .db_operation("load release list items")?;

    load_items(releases, db).await
}

/// Loads list associations and returns one item per row in the same order.
pub(crate) async fn load_items(
    releases: Vec<ReleaseRow>,
    db: &impl ConnectionTrait,
) -> Result<Vec<ReleaseListItem>, DatabaseError> {
    if releases.is_empty() {
        return Ok(vec![]);
    }

    let release_ids = releases
        .iter()
        .map(|release| release.id)
        .collect::<Vec<_>>();
    let (mut artists, catalog_number_rows, mut cover_art_urls) = tokio::try_join!(
        load_artists(&release_ids, db),
        async {
            release_catalog_number::Entity::find()
                .select_only()
                .column(release_catalog_number::Column::ReleaseId)
                .column(release_catalog_number::Column::CatalogNumber)
                .filter(
                    release_catalog_number::Column::ReleaseId
                        .is_in(release_ids.iter().copied()),
                )
                .order_by_asc(release_catalog_number::Column::Id)
                .into_tuple::<(i32, String)>()
                .all(db)
                .await
                .db_operation("load release list catalog numbers")
        },
        load_cover_art_urls(&release_ids, db),
    )?;

    let mut catalog_numbers: HashMap<i32, Vec<String>> = HashMap::new();
    for (release_id, catalog_number) in catalog_number_rows {
        catalog_numbers
            .entry(release_id)
            .or_default()
            .push(catalog_number);
    }

    Ok(releases
        .into_iter()
        .map(|release| ReleaseListItem {
            id: release.id,
            title: release.title,
            cover_art_url: cover_art_urls.remove(&release.id),
            artists: artists.remove(&release.id).unwrap_or_default(),
            release_type: release.release_type,
            release_date: DateWithPrecision::from_option(
                release.release_date,
                release.release_date_precision,
            ),
            catalog_numbers: catalog_numbers
                .remove(&release.id)
                .unwrap_or_default(),
        })
        .collect())
}

pub(crate) async fn load_artists(
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
        .db_operation("load release list artists")?;

    let mut artists: HashMap<i32, Vec<SimpleArtist>> = HashMap::new();
    for (release_id, id, name) in artist_rows {
        artists
            .entry(release_id)
            .or_default()
            .push(SimpleArtist { id, name });
    }

    Ok(artists)
}

pub(crate) async fn load_cover_art_urls(
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, String>, DatabaseError> {
    if release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let image_rows = release_image::Entity::find()
        .select_only()
        .column(release_image::Column::ReleaseId)
        .column(image::Column::Directory)
        .column(image::Column::Filename)
        .column(image::Column::Backend)
        .join(JoinType::InnerJoin, release_image::Relation::Image.def())
        .filter(
            release_image::Column::ReleaseId.is_in(release_ids.iter().copied()),
        )
        .filter(release_image::Column::Type.eq(ReleaseImageType::Cover))
        .order_by_desc(image::Column::UploadedAt)
        .order_by_desc(image::Column::Id)
        .into_tuple::<(i32, String, String, StorageBackend)>()
        .all(db)
        .await
        .db_operation("load release list cover art")?;

    let mut cover_art_urls = HashMap::new();
    for (release_id, directory, filename, backend) in image_rows {
        cover_art_urls.entry(release_id).or_insert_with(|| {
            Image::format_url(backend, &directory, &filename)
        });
    }

    Ok(cover_art_urls)
}
