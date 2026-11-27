use domain::shared::PageResponse;
use entity::enums::EntityType;
use entity::label;
use infra_db::SeaOrmRepository;
use label_repo::LabelListItem;

use super::LabelFilter;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;
use crate::shared::http::{CorrectionSortField, PageQuery, SortDirection};

#[infra_db::observe("label.find_sorted_by_correction")]
async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: LabelFilter,
    sort_field: CorrectionSortField,
    sort_direction: SortDirection,
    pagination: PageQuery,
) -> Result<PageResponse<LabelListItem>, DatabaseError> {
    let entity_ids = crate::features::correction::correction_sorted_entity_ids(
        &repo.conn,
        EntityType::Label,
        sort_field,
        sort_direction.into(),
    )
    .await
    .db_context("list correction-sorted label ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let select = label_repo::list_select(
        Some(&entity_ids),
        filter.founded_date_from,
        filter.founded_date_to,
        filter.is_dissolved,
    );
    let labels = label_repo::load_list(select, &repo.conn).await?;
    let labels = utils::sort_by_id_list(labels, &entity_ids, |label| label.id);

    Ok(utils::page_from_items(labels, &pagination))
}

#[infra_db::observe("label.find_by_filter")]
pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: LabelFilter,
    pagination: PageQuery,
) -> Result<PageResponse<LabelListItem>, DatabaseError> {
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

    let select = label_repo::list_select(
        None,
        filter.founded_date_from,
        filter.founded_date_to,
        filter.is_dissolved,
    );
    let page = utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        label::Column::Id,
        |select| async {
            label_repo::load_list(select, &repo.conn)
                .await
                .map_err(Into::into)
        },
    )
    .await?;
    Ok(page)
}
