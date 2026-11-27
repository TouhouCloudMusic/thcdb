use artist_repo::list::{self as artist_list, ArtistListItem};
use domain::shared::PageResponse;
use entity::{artist, release, song, tag};
use infra_db::SeaOrmRepository;
use release_repo::ReleaseListItem;
use serde::Serialize;
use song_repo::list::{self as song_list, SongListing};
use tag_repo::TagListItem;
use utoipa::ToSchema;

use super::filter::TagEntitySort;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

#[derive(Serialize, ToSchema)]
#[serde(tag = "entity_type", content = "page", rename_all = "snake_case")]
pub(super) enum TagEntitiesPage {
    Release(PageResponse<ReleaseListItem>),
    Song(PageResponse<SongListing>),
    Artist(PageResponse<ArtistListItem>),
}

#[infra_db::observe("tag.find_artists")]
pub(super) async fn find_artists(
    repo: &SeaOrmRepository,
    tag_id: i32,
    pagination: crate::shared::http::PageQuery,
) -> Result<PageResponse<ArtistListItem>, DatabaseError> {
    let artists = utils::find_many_page(
        &repo.conn,
        tag_repo::artists_select(tag_id),
        pagination,
        artist::Column::Id,
        |select| async {
            artist_list::load(select, &repo.conn)
                .await
                .map_err(DatabaseError::from)
        },
    )
    .await?;
    Ok(artists)
}

#[infra_db::observe("tag.find_releases")]
pub(super) async fn find_releases(
    repo: &SeaOrmRepository,
    tag_id: i32,
    sort: TagEntitySort,
    pagination: crate::shared::http::PageQuery,
) -> Result<PageResponse<ReleaseListItem>, DatabaseError> {
    let releases = utils::find_many_page(
        &repo.conn,
        tag_repo::releases_select(tag_id, sort),
        pagination,
        release::Column::Id,
        |select| async {
            release_repo::load_list(select, &repo.conn)
                .await
                .map_err(DatabaseError::from)
        },
    )
    .await?;
    Ok(releases)
}

#[infra_db::observe("tag.find_songs")]
pub(super) async fn find_songs(
    repo: &SeaOrmRepository,
    tag_id: i32,
    sort: TagEntitySort,
    pagination: crate::shared::http::PageQuery,
) -> Result<PageResponse<SongListing>, DatabaseError> {
    let songs = utils::find_many_page(
        &repo.conn,
        tag_repo::songs_select(tag_id, sort),
        pagination,
        song::Column::Id,
        |select| async {
            song_list::load(select, &repo.conn)
                .await
                .map_err(DatabaseError::from)
        },
    )
    .await?;
    Ok(songs)
}

#[infra_db::observe("tag.find_by_filter")]
pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: super::TagFilter,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<TagListItem>, DatabaseError> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        let page = find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await?;
        return Ok(page);
    }

    let select = tag_repo::list_select(None, filter.tag_types);
    let page = utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        tag::Column::Id,
        |select| async {
            tag_repo::load_list(select, &repo.conn)
                .await
                .map_err(Into::into)
        },
    )
    .await?;
    Ok(page)
}

#[infra_db::observe("tag.find_sorted_by_correction")]
async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: super::TagFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<TagListItem>, DatabaseError> {
    use entity::enums::EntityType;

    let entity_ids = crate::features::correction::correction_sorted_entity_ids(
        &repo.conn,
        EntityType::Tag,
        sort_field,
        sort_direction.into(),
    )
    .await
    .db_context("list correction-sorted tag ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let select = tag_repo::list_select(Some(&entity_ids), filter.tag_types);
    let mut tags = tag_repo::load_list(select, &repo.conn).await?;

    tags = crate::infra::database::utils::sort_by_id_list(
        tags,
        &entity_ids,
        |tag| tag.id,
    );

    Ok(utils::page_from_items(tags, &pagination))
}
