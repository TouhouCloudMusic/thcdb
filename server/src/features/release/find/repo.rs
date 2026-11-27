use domain::shared::PageResponse;
use entity::enums::EntityType;
use infra_db::SeaOrmRepository;
use release_repo::ReleaseListItem;

use super::{PageQuery, ReleaseFilter, ReleaseSortField};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;
use crate::shared::http::{CorrectionSortField, SortDirection};

#[infra_db::observe("release.find_sorted_by_release_date")]
async fn find_sorted_by_release_date(
    repo: &SeaOrmRepository,
    filter: ReleaseFilter,
    sort_direction: SortDirection,
    pagination: PageQuery,
) -> Result<PageResponse<ReleaseListItem>, DatabaseError> {
    let (items, total_items) = release_repo::find_list_page(
        &repo.conn,
        filter.release_types,
        Some(sort_direction.into()),
        pagination.offset(),
        pagination.limit(),
    )
    .await?;
    Ok(pagination.to_response(items, total_items))
}

#[infra_db::observe("release.find_sorted_by_correction")]
async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: ReleaseFilter,
    sort_field: CorrectionSortField,
    sort_direction: SortDirection,
    pagination: PageQuery,
) -> Result<PageResponse<ReleaseListItem>, DatabaseError> {
    let entity_ids = crate::features::correction::correction_sorted_entity_ids(
        &repo.conn,
        EntityType::Release,
        sort_field,
        sort_direction.into(),
    )
    .await
    .db_context("list correction-sorted release ids")?;

    let releases = release_repo::find_list_by_ids(
        &repo.conn,
        filter.release_types,
        &entity_ids,
    )
    .await?;
    let releases =
        utils::sort_by_id_list(releases, &entity_ids, |release| release.id);

    Ok(utils::page_from_items(releases, &pagination))
}

#[infra_db::observe("release.find_by_filter")]
pub(crate) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: ReleaseFilter,
    pagination: PageQuery,
) -> Result<PageResponse<ReleaseListItem>, DatabaseError> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        let page = match sort_field {
            ReleaseSortField::ReleaseDate => {
                find_sorted_by_release_date(
                    repo,
                    filter,
                    sort_direction,
                    pagination,
                )
                .await
            }
            ReleaseSortField::CreatedAt => {
                find_sorted_by_correction(
                    repo,
                    filter,
                    CorrectionSortField::CreatedAt,
                    sort_direction,
                    pagination,
                )
                .await
            }
            ReleaseSortField::UpdatedAt => {
                find_sorted_by_correction(
                    repo,
                    filter,
                    CorrectionSortField::UpdatedAt,
                    sort_direction,
                    pagination,
                )
                .await
            }
        }?;
        return Ok(page);
    }

    let (items, total_items) = release_repo::find_list_page(
        &repo.conn,
        filter.release_types,
        None,
        pagination.offset(),
        pagination.limit(),
    )
    .await?;
    Ok(pagination.to_response(items, total_items))
}
