use domain::shared::PageResponse;
use entity::enums::EntityType;
use entity::song;
use infra_db::SeaOrmRepository;
use sea_orm::{ColumnTrait, QueryFilter, Select};
use song_repo::list;

use super::filter::SongFilter;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::utils;
use crate::shared::http::{CorrectionSortField, PageQuery, SortDirection};

#[infra_db::observe("song.find_sorted_by_correction")]
async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: SongFilter,
    sort_field: CorrectionSortField,
    sort_direction: SortDirection,
    pagination: PageQuery,
) -> Result<PageResponse<list::SongListing>, DatabaseError> {
    let entity_ids = crate::features::correction::correction_sorted_entity_ids(
        &repo.conn,
        EntityType::Song,
        sort_field,
        match sort_direction {
            SortDirection::Asc => sea_orm::Order::Asc,
            SortDirection::Desc => sea_orm::Order::Desc,
        },
    )
    .await
    .db_context("list correction-sorted song ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let select = filter
        .into_select()
        .filter(song::Column::Id.is_in(entity_ids.clone()));

    let mut songs = list::load(select, &repo.conn).await?;

    songs = crate::infra::database::utils::sort_by_id_list(
        songs,
        &entity_ids,
        |song| song.id,
    );

    Ok(utils::page_from_items(songs, &pagination))
}

#[infra_db::observe("song.find_by_filter")]
pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: SongFilter,
    pagination: PageQuery,
) -> Result<PageResponse<list::SongListing>, DatabaseError> {
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
        .await
        .db_context("explore songs")?;
        return Ok(page);
    }

    let select: Select<song::Entity> = filter.into_select();
    let page = utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        song::Column::Id,
        |select| async {
            list::load(select, &repo.conn)
                .await
                .map_err(DatabaseError::from)
        },
    )
    .await
    .db_context("explore songs")?;
    Ok(page)
}
