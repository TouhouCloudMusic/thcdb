use artist_repo::list::{self, ArtistListItem};
use domain::shared::PageResponse;
use entity::artist;
use entity::enums::EntityType;
use infra_db::SeaOrmRepository;

use super::{ArtistFilter, PageQuery};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;
use crate::shared::http::{CorrectionSortField, SortDirection};

#[infra_db::observe("artist.find_sorted_by_correction")]
async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: ArtistFilter,
    sort_field: CorrectionSortField,
    sort_direction: SortDirection,
    pagination: PageQuery,
) -> Result<PageResponse<ArtistListItem>, DatabaseError> {
    let entity_ids = crate::features::correction::correction_sorted_entity_ids(
        &repo.conn,
        EntityType::Artist,
        sort_field,
        sort_direction.into(),
    )
    .await
    .db_context("list correction-sorted artist ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let select = list::select(Some(entity_ids.clone()), filter.artist_types);
    let artists = list::load(select, &repo.conn).await?;
    let artists =
        utils::sort_by_id_list(artists, &entity_ids, |artist| artist.id);

    Ok(utils::page_from_items(artists, &pagination))
}

#[infra_db::observe("artist.find_by_filter")]
pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: ArtistFilter,
    pagination: PageQuery,
) -> Result<PageResponse<ArtistListItem>, DatabaseError> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        return Ok(find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await?);
    }

    let select = list::select(None, filter.artist_types);
    let page = utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        artist::Column::Id,
        |select| async {
            list::load(select, &repo.conn).await.map_err(Into::into)
        },
    )
    .await?;
    Ok(page)
}
