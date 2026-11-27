use std::collections::HashMap;

use domain::shared::{CursorResponse, DateWithPrecision, SimpleArtist};
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{release, release_catalog_number};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait,
    FromQueryResult, PartialModelTrait, QueryFilter, QueryOrder, QuerySelect,
    QueryTrait, Select,
};
use sea_query::SimpleExpr;
use serde::Serialize;
use utoipa::ToSchema;

use crate::{load_artists, load_cover_art_urls};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct ReleaseListItem {
    pub id: i32,
    pub title: String,
    pub cover_art_url: Option<String>,
    pub artists: Vec<SimpleArtist>,
    pub release_type: ReleaseType,
    pub release_date: Option<DateWithPrecision>,
    pub catalog_numbers: Vec<String>,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "release::Entity", from_query_result)]
struct ReleaseRow {
    id: i32,
    title: String,
    release_type: ReleaseType,
    release_date: Option<chrono::NaiveDate>,
    release_date_precision: DatePrecision,
}

/// Loads list associations without separating each row from its attached value.
async fn assemble_list<M>(
    releases: Vec<(ReleaseRow, M)>,
    db: &impl ConnectionTrait,
) -> Result<Vec<(ReleaseListItem, M)>, DatabaseError> {
    if releases.is_empty() {
        return Ok(vec![]);
    }

    let release_ids = releases
        .iter()
        .map(|(release, _)| release.id)
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
                .db_context("load release list catalog numbers")
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
        .map(|(release, value)| {
            (
                ReleaseListItem {
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
                },
                value,
            )
        })
        .collect())
}

pub async fn load_list(
    select: Select<release::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<ReleaseListItem>, DatabaseError> {
    let releases = select
        .into_partial_model::<ReleaseRow>()
        .all(db)
        .await
        .db_context("load release list items")?;

    let rows = releases.into_iter().map(|release| (release, ())).collect();
    Ok(assemble_list(rows, db)
        .await?
        .into_iter()
        .map(|(item, ())| item)
        .collect())
}

/// Loads a search page with each release's nullable text match expression.
///
/// The query must be ordered, yield one row per release, and have no pagination.
/// `limit` and `cursor` are the caller's validated offset pagination parameters.
pub async fn load_list_with_match(
    select: Select<release::Entity>,
    matched_name: SimpleExpr,
    limit: u32,
    cursor: i32,
    db: &impl ConnectionTrait,
) -> Result<CursorResponse<(ReleaseListItem, Option<String>)>, DatabaseError> {
    let page = infra_db::observe::<_, DatabaseError, _>(
        "search.find_matches",
        async {
            let matched_name_column = "__release_matched_name";
            let select = ReleaseRow::select_cols(select.select_only())
                .expr_as(matched_name, matched_name_column)
                .offset(u64::try_from(cursor).unwrap_or(0))
                .limit(u64::from(limit) + 1);

            let mut rows = db
                .query_all(select.build(db.get_database_backend()))
                .await
                .db_context("search list items")?;
            let next_cursor = if rows.len() > limit as usize {
                rows.truncate(limit as usize);
                Some(cursor + i32::try_from(limit).unwrap_or(i32::MAX))
            } else {
                None
            };
            let rows = rows
                .into_iter()
                .map(|row| {
                    Ok((
                        ReleaseRow::from_query_result(&row, "")?,
                        row.try_get("", matched_name_column)?,
                    ))
                })
                .collect::<Result<_, sea_orm::DbErr>>()
                .db_context("read search list items")?;

            Ok(CursorResponse {
                items: rows,
                next_cursor,
            })
        },
    )
    .await?;

    Ok(CursorResponse {
        items: assemble_list(page.items, db).await?,
        next_cursor: page.next_cursor,
    })
}
