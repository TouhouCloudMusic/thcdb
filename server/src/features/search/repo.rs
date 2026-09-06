use domain::shared::CursorResponse;
use entity::{
    artist, artist_localized_name, event, event_alternative_name, label,
    label_localized_name, release, release_localized_title, song,
    song_localized_title, tag, tag_alternative_name,
};
use infra_db::SeaOrmRepository;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityName, EntityTrait, PartialModelTrait,
    QuerySelect, QueryTrait,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{
    Alias, Expr, ExprTrait, Func, JoinType, NullOrdering, Order, Query,
    SelectStatement, UnionType,
};

use super::SearchResult;
use crate::features::artist::list::{ArtistListItem, ArtistRow};
use crate::features::event::list::{EventListItem, EventRow};
use crate::features::label::list::{LabelListItem, LabelRow};
use crate::features::release::list::{ReleaseListItem, ReleaseRow};
use crate::features::song::list::{SongListItem, SongRow};
use crate::features::tag::list::{TagListItem, TagRow};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

fn match_name_select(keyword: &str, names: SelectStatement) -> SelectStatement {
    let search_term = Func::lower(keyword);
    let lower_name = Func::lower(Expr::col(Alias::new("name")));

    let id = Alias::new("id");
    let dist = Alias::new("dist");
    let matched_name = Alias::new("matched_name");

    Query::select()
        .distinct_on([id.clone()])
        .column(id.clone())
        .expr_as(
            lower_name
                .clone()
                .binary(PgBinOper::SimilarityDistance, search_term.clone()),
            dist.clone(),
        )
        .column(matched_name.clone())
        .from_subquery(names, Alias::new("names"))
        .and_where(if keyword.chars().count() < 3 {
            lower_name.like(format!("{keyword}%").to_lowercase())
        } else {
            lower_name.binary(PgBinOper::Similarity, search_term)
        })
        .order_by(id, Order::Asc)
        .order_by(dist, Order::Asc)
        .order_by_with_nulls(matched_name, Order::Asc, NullOrdering::First)
        .to_owned()
}

async fn search_matches<
    E: EntityTrait,
    R: PartialModelTrait,
    A: ColumnTrait,
>(
    db: &impl ConnectionTrait,
    search_term: &str,
    (entity_id, primary_name): (E::Column, E::Column),
    (alternative_id, alternative_name): (A, A),
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<SearchResult<R>>, DatabaseError> {
    let id = Alias::new("id");
    let name = Alias::new("name");
    let dist = Alias::new("dist");
    let matched_name = Alias::new("matched_name");

    let names = Query::select()
        .expr_as(entity_id.into_expr(), id.clone())
        .expr_as(primary_name.into_expr(), name.clone())
        .expr_as(Expr::val(None::<String>), matched_name.clone())
        .from(E::default().table_ref())
        .union(
            UnionType::All,
            Query::select()
                .expr_as(alternative_id.into_expr(), id.clone())
                .expr_as(alternative_name.into_expr(), name)
                .expr_as(alternative_name.into_expr(), matched_name.clone())
                .from(A::EntityName::default().table_ref())
                .to_owned(),
        )
        .to_owned();

    let ranked_alias = Alias::new("ranked");
    let mut query = R::select_cols(E::find().select_only()).into_query();
    query
        .join_subquery(
            JoinType::InnerJoin,
            match_name_select(search_term, names),
            ranked_alias.clone(),
            entity_id
                .into_expr()
                .equals((ranked_alias.clone(), id.clone())),
        )
        .expr_as(
            Expr::col((ranked_alias.clone(), matched_name.clone())),
            matched_name,
        )
        .order_by((ranked_alias.clone(), dist), Order::Asc)
        .order_by((ranked_alias, id), Order::Asc)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit) + 1);

    let statement = db.get_database_backend().build(&query);
    let mut rows = db
        .query_all(statement)
        .await
        .db_operation("search list items")?;

    let next_cursor = if rows.len() > limit as usize {
        rows.truncate(limit as usize);
        Some(cursor + i32::try_from(limit).unwrap_or(i32::MAX))
    } else {
        None
    };

    let items = rows
        .into_iter()
        .map(|row| {
            Ok(SearchResult {
                item: R::from_query_result(&row, "")?,
                matched_name: row.try_get("", "matched_name")?,
            })
        })
        .collect::<Result<_, sea_orm::DbErr>>()
        .db_operation("read search list items")?;

    Ok(CursorResponse { items, next_cursor })
}

macro_rules! define_search {
    (
        $function:ident {
            entity:
            $entity:ident,name:
            $name:ident,alternative:
            $alternative:ident { foreign_key: $foreign_key:ident, },row:
            $row:ty =>
            $item:ty,load_items:
            $load_items:path,
        }
    ) => {
        pub async fn $function(
            repo: &SeaOrmRepository,
            search_term: &str,
            limit: u32,
            cursor: i32,
        ) -> Result<CursorResponse<SearchResult<$item>>, DatabaseError> {
            let db = &repo.conn;
            let matches = search_matches::<$entity::Entity, $row, _>(
                db,
                search_term,
                ($entity::Column::Id, $entity::Column::$name),
                (
                    $alternative::Column::$foreign_key,
                    $alternative::Column::$name,
                ),
                limit,
                cursor,
            )
            .await?;
            let (rows, matched_names): (Vec<_>, Vec<_>) = matches
                .items
                .into_iter()
                .map(|SearchResult { item, matched_name }| (item, matched_name))
                .unzip();
            let items = $load_items(rows, db).await?;

            Ok(CursorResponse {
                items: std::iter::zip(items, matched_names)
                    .map(|(item, matched_name)| SearchResult {
                        item,
                        matched_name,
                    })
                    .collect(),
                next_cursor: matches.next_cursor,
            })
        }
    };
}

define_search! {
    search_artists {
        entity: artist,
        name: Name,
        alternative: artist_localized_name {
            foreign_key: ArtistId,
        },
        row: ArtistRow => ArtistListItem,
        load_items: crate::features::artist::list::load_items,
    }
}

define_search! {
    search_releases {
        entity: release,
        name: Title,
        alternative: release_localized_title {
            foreign_key: ReleaseId,
        },
        row: ReleaseRow => ReleaseListItem,
        load_items: crate::features::release::list::load_items,
    }
}

define_search! {
    search_songs {
        entity: song,
        name: Title,
        alternative: song_localized_title {
            foreign_key: SongId,
        },
        row: SongRow => SongListItem,
        load_items: crate::features::song::list::load_items,
    }
}

pub async fn search_events(
    repo: &SeaOrmRepository,
    search_term: &str,
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<SearchResult<EventListItem>>, DatabaseError> {
    let matches = search_matches::<event::Entity, EventRow, _>(
        &repo.conn,
        search_term,
        (event::Column::Id, event::Column::Name),
        (
            event_alternative_name::Column::EventId,
            event_alternative_name::Column::Name,
        ),
        limit,
        cursor,
    )
    .await?;

    Ok(
        matches.map(|SearchResult { item, matched_name }| SearchResult {
            item: EventListItem::from(item),
            matched_name,
        }),
    )
}

define_search! {
    search_labels {
        entity: label,
        name: Name,
        alternative: label_localized_name {
            foreign_key: LabelId,
        },
        row: LabelRow => LabelListItem,
        load_items: crate::features::label::list::load_items,
    }
}

define_search! {
    search_tags {
        entity: tag,
        name: Name,
        alternative: tag_alternative_name {
            foreign_key: TagId,
        },
        row: TagRow => TagListItem,
        load_items: crate::features::tag::list::load_items,
    }
}
