use entity::{
    artist, artist_localized_name, event, event_alternative_name, label,
    label_localized_name, release, release_localized_title, song,
    song_localized_title, tag, tag_alternative_name,
};
use sea_orm::{ColumnTrait, ConnectionTrait, DbErr, FromQueryResult};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{
    Alias, Expr, ExprTrait, Func, IntoTableRef, Order, Query, SelectStatement,
    UnionType,
};

use crate::domain::artist::SimpleArtist;
use crate::domain::event::SimpleEvent;
use crate::domain::label::SimpleLabel;
use crate::domain::release::SimpleRelease;
use crate::domain::shared::CursorResponse;
use crate::domain::song::SongRef;
use crate::domain::tag::TagRef;
use crate::infra::database::sea_orm::SeaOrmRepository;

#[derive(Clone, Copy)]
enum MatchMode {
    Trgm,
    Prefix,
}

fn match_mode(keyword: &str) -> MatchMode {
    if keyword.chars().count() < 3 {
        MatchMode::Prefix
    } else {
        MatchMode::Trgm
    }
}

const SEARCH_ALIAS_ID: &str = "id";
const SEARCH_ALIAS_DIST: &str = "dist";
const SEARCH_ALIAS_HITS: &str = "hits";
const SEARCH_ALIAS_RANKED: &str = "ranked";

fn create_ranked(
    mut base_hits: SelectStatement,
    alt_hits: SelectStatement,
) -> SelectStatement {
    let hits_alias = Alias::new(SEARCH_ALIAS_HITS);
    let id_alias = Alias::new(SEARCH_ALIAS_ID);
    let dist_alias = Alias::new(SEARCH_ALIAS_DIST);

    Query::select()
        .expr_as(
            Expr::col((hits_alias.clone(), id_alias.clone())),
            id_alias.clone(),
        )
        .expr_as(
            Func::min(Expr::col((hits_alias.clone(), dist_alias.clone()))),
            dist_alias,
        )
        .from_subquery(
            base_hits.union(UnionType::All, alt_hits).take(),
            hits_alias.clone(),
        )
        .group_by_col((hits_alias, id_alias))
        .to_owned()
}

#[derive(FromQueryResult)]
struct ArtistRow {
    id: i32,
    name: String,
}

#[derive(FromQueryResult)]
struct ReleaseRow {
    id: i32,
    title: String,
}

#[derive(FromQueryResult)]
struct SongRow {
    id: i32,
    title: String,
}

#[derive(FromQueryResult)]
struct EventRow {
    id: i32,
    name: String,
}

#[derive(FromQueryResult)]
struct LabelRow {
    id: i32,
    name: String,
}

#[derive(FromQueryResult)]
struct TagRow {
    id: i32,
    name: String,
    r#type: entity::sea_orm_active_enums::TagType,
}

fn paginate_offset<T>(
    mut items: Vec<T>,
    limit: u32,
    cursor: i32,
) -> CursorResponse<T> {
    if items.len() <= limit as usize {
        return CursorResponse {
            items,
            next_cursor: None,
        };
    }

    items.pop();

    CursorResponse {
        items,
        next_cursor: Some(cursor + i32::try_from(limit).unwrap_or(i32::MAX)),
    }
}

fn create_hits(
    keyword: &str,
    entity: impl IntoTableRef,
    id: impl ColumnTrait,
    ident: impl ColumnTrait,
) -> SelectStatement {
    let id_alias = Alias::new("id");
    let dist_alias = Alias::new("dist");

    let mode = match_mode(keyword);
    let search_term = Func::lower(keyword);
    let prefix_pattern = format!("{keyword}%").to_lowercase();
    let field = Func::lower(ident.into_expr());
    let cond_field = field.clone();
    let cond = match mode {
        MatchMode::Trgm => {
            cond_field.binary(PgBinOper::Similarity, search_term.clone())
        }
        MatchMode::Prefix => cond_field.like(prefix_pattern),
    };

    Query::select()
        .expr_as(id.into_expr(), id_alias)
        .expr_as(
            field.binary(PgBinOper::SimilarityDistance, search_term),
            dist_alias,
        )
        .from(entity)
        .and_where(cond)
        .to_owned()
}

pub async fn search_artists(
    repo: &SeaOrmRepository,
    search_term: &str,
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<SimpleArtist>, DbErr> {
    let db = &repo.conn;
    let ranked_alias = Alias::new(SEARCH_ALIAS_RANKED);
    let id_alias = Alias::new(SEARCH_ALIAS_ID);
    let dist_alias = Alias::new(SEARCH_ALIAS_DIST);

    let ranked = create_ranked(
        create_hits(
            search_term,
            artist::Entity,
            artist::Column::Id,
            artist::Column::Name,
        ),
        create_hits(
            search_term,
            artist_localized_name::Entity,
            artist_localized_name::Column::ArtistId,
            artist_localized_name::Column::Name,
        ),
    );

    let query = Query::select()
        .columns([
            (artist::Entity, artist::Column::Id),
            (artist::Entity, artist::Column::Name),
        ])
        .from_subquery(ranked, ranked_alias.clone())
        .inner_join(
            artist::Entity,
            Expr::col((artist::Entity, artist::Column::Id))
                .equals((ranked_alias.clone(), id_alias.clone())),
        )
        .order_by((ranked_alias.clone(), dist_alias.clone()), Order::Asc)
        .order_by((artist::Entity, artist::Column::Id), Order::Asc)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit) + 1)
        .to_owned();

    let stmt = db.get_database_backend().build(&query);
    let items = ArtistRow::find_by_statement(stmt)
        .all(db)
        .await?
        .into_iter()
        .map(|row| SimpleArtist {
            id: row.id,
            name: row.name,
        })
        .collect();

    Ok(paginate_offset(items, limit, cursor))
}

pub async fn search_releases(
    repo: &SeaOrmRepository,
    search_term: &str,
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<SimpleRelease>, DbErr> {
    let db = &repo.conn;
    let ranked_alias = Alias::new(SEARCH_ALIAS_RANKED);
    let id_alias = Alias::new(SEARCH_ALIAS_ID);
    let dist_alias = Alias::new(SEARCH_ALIAS_DIST);

    let ranked = create_ranked(
        create_hits(
            search_term,
            release::Entity,
            release::Column::Id,
            release::Column::Title,
        ),
        create_hits(
            search_term,
            release_localized_title::Entity,
            release_localized_title::Column::ReleaseId,
            release_localized_title::Column::Title,
        ),
    );

    let query = Query::select()
        .columns([
            (release::Entity, release::Column::Id),
            (release::Entity, release::Column::Title),
        ])
        .from_subquery(ranked, ranked_alias.clone())
        .inner_join(
            release::Entity,
            Expr::col((release::Entity, release::Column::Id))
                .equals((ranked_alias.clone(), id_alias.clone())),
        )
        .order_by((ranked_alias.clone(), dist_alias.clone()), Order::Asc)
        .order_by((release::Entity, release::Column::Id), Order::Asc)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit) + 1)
        .to_owned();

    let stmt = db.get_database_backend().build(&query);
    let items = ReleaseRow::find_by_statement(stmt)
        .all(db)
        .await?
        .into_iter()
        .map(|row| SimpleRelease {
            id: row.id,
            title: row.title,
            cover_art_url: None,
        })
        .collect();

    Ok(paginate_offset(items, limit, cursor))
}

pub async fn search_songs(
    repo: &SeaOrmRepository,
    search_term: &str,
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<SongRef>, DbErr> {
    let db = &repo.conn;
    let ranked_alias = Alias::new(SEARCH_ALIAS_RANKED);
    let id_alias = Alias::new(SEARCH_ALIAS_ID);
    let dist_alias = Alias::new(SEARCH_ALIAS_DIST);

    let ranked = create_ranked(
        create_hits(
            search_term,
            song::Entity,
            song::Column::Id,
            song::Column::Title,
        ),
        create_hits(
            search_term,
            song_localized_title::Entity,
            song_localized_title::Column::SongId,
            song_localized_title::Column::Title,
        ),
    );

    let query = Query::select()
        .columns([
            (song::Entity, song::Column::Id),
            (song::Entity, song::Column::Title),
        ])
        .from_subquery(ranked, ranked_alias.clone())
        .inner_join(
            song::Entity,
            Expr::col((song::Entity, song::Column::Id))
                .equals((ranked_alias.clone(), id_alias.clone())),
        )
        .order_by((ranked_alias.clone(), dist_alias.clone()), Order::Asc)
        .order_by((song::Entity, song::Column::Id), Order::Asc)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit) + 1)
        .to_owned();

    let stmt = db.get_database_backend().build(&query);
    let items = SongRow::find_by_statement(stmt)
        .all(db)
        .await?
        .into_iter()
        .map(|row| SongRef {
            id: row.id,
            title: row.title,
        })
        .collect();

    Ok(paginate_offset(items, limit, cursor))
}

pub async fn search_events(
    repo: &SeaOrmRepository,
    search_term: &str,
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<SimpleEvent>, DbErr> {
    let db = &repo.conn;
    let ranked_alias = Alias::new(SEARCH_ALIAS_RANKED);
    let id_alias = Alias::new(SEARCH_ALIAS_ID);
    let dist_alias = Alias::new(SEARCH_ALIAS_DIST);

    let ranked = create_ranked(
        create_hits(
            search_term,
            event::Entity,
            event::Column::Id,
            event::Column::Name,
        ),
        create_hits(
            search_term,
            event_alternative_name::Entity,
            event_alternative_name::Column::EventId,
            event_alternative_name::Column::Name,
        ),
    );

    let query = Query::select()
        .columns([
            (event::Entity, event::Column::Id),
            (event::Entity, event::Column::Name),
        ])
        .from_subquery(ranked, ranked_alias.clone())
        .inner_join(
            event::Entity,
            Expr::col((event::Entity, event::Column::Id))
                .equals((ranked_alias.clone(), id_alias.clone())),
        )
        .order_by((ranked_alias.clone(), dist_alias.clone()), Order::Asc)
        .order_by((event::Entity, event::Column::Id), Order::Asc)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit) + 1)
        .to_owned();

    let stmt = db.get_database_backend().build(&query);
    let items = EventRow::find_by_statement(stmt)
        .all(db)
        .await?
        .into_iter()
        .map(|row| SimpleEvent {
            id: row.id,
            name: row.name,
        })
        .collect();

    Ok(paginate_offset(items, limit, cursor))
}

pub async fn search_labels(
    repo: &SeaOrmRepository,
    search_term: &str,
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<SimpleLabel>, DbErr> {
    let db = &repo.conn;
    let ranked_alias = Alias::new(SEARCH_ALIAS_RANKED);
    let id_alias = Alias::new(SEARCH_ALIAS_ID);
    let dist_alias = Alias::new(SEARCH_ALIAS_DIST);

    let ranked = create_ranked(
        create_hits(
            search_term,
            label::Entity,
            label::Column::Id,
            label::Column::Name,
        ),
        create_hits(
            search_term,
            label_localized_name::Entity,
            label_localized_name::Column::LabelId,
            label_localized_name::Column::Name,
        ),
    );

    let query = Query::select()
        .columns([
            (label::Entity, label::Column::Id),
            (label::Entity, label::Column::Name),
        ])
        .from_subquery(ranked, ranked_alias.clone())
        .inner_join(
            label::Entity,
            Expr::col((label::Entity, label::Column::Id))
                .equals((ranked_alias.clone(), id_alias.clone())),
        )
        .order_by((ranked_alias.clone(), dist_alias.clone()), Order::Asc)
        .order_by((label::Entity, label::Column::Id), Order::Asc)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit) + 1)
        .to_owned();

    let stmt = db.get_database_backend().build(&query);
    let items = LabelRow::find_by_statement(stmt)
        .all(db)
        .await?
        .into_iter()
        .map(|row| SimpleLabel {
            id: row.id,
            name: row.name,
        })
        .collect();

    Ok(paginate_offset(items, limit, cursor))
}

pub async fn search_tags(
    repo: &SeaOrmRepository,
    search_term: &str,
    limit: u32,
    cursor: i32,
) -> Result<CursorResponse<TagRef>, DbErr> {
    let db = &repo.conn;
    let ranked_alias = Alias::new(SEARCH_ALIAS_RANKED);
    let id_alias = Alias::new(SEARCH_ALIAS_ID);
    let dist_alias = Alias::new(SEARCH_ALIAS_DIST);

    let ranked = create_ranked(
        create_hits(
            search_term,
            tag::Entity,
            tag::Column::Id,
            tag::Column::Name,
        ),
        create_hits(
            search_term,
            tag_alternative_name::Entity,
            tag_alternative_name::Column::TagId,
            tag_alternative_name::Column::Name,
        ),
    );

    let query = Query::select()
        .columns([
            (tag::Entity, tag::Column::Id),
            (tag::Entity, tag::Column::Name),
            (tag::Entity, tag::Column::Type),
        ])
        .expr_as(
            Expr::col((tag::Entity, tag::Column::Type)).cast_as("text"),
            tag::Column::Type,
        )
        .from_subquery(ranked, ranked_alias.clone())
        .inner_join(
            tag::Entity,
            Expr::col((tag::Entity, tag::Column::Id))
                .equals((ranked_alias.clone(), id_alias.clone())),
        )
        .order_by((ranked_alias.clone(), dist_alias.clone()), Order::Asc)
        .order_by((tag::Entity, tag::Column::Id), Order::Asc)
        .offset(u64::try_from(cursor).unwrap_or(0))
        .limit(u64::from(limit) + 1)
        .to_owned();

    let stmt = db.get_database_backend().build(&query);
    let items = TagRow::find_by_statement(stmt)
        .all(db)
        .await?
        .into_iter()
        .map(|row| TagRef {
            id: row.id,
            name: row.name,
            r#type: row.r#type,
        })
        .collect();

    Ok(paginate_offset(items, limit, cursor))
}
